import React, { useEffect, useRef, useState } from 'react';
import './FacturePreview.css'; // réutilise ton style existant
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import ProgressOverlay from '../components/ProgressOverlay';
import { ToastProvider, useToast } from '../components/ToastProvider';

// ----- Export par défaut AVEC provider pour les toasts
export default function ViewDevisPageWithProviders() {
  return (
    <ToastProvider>
      <ViewDevisPage />
    </ToastProvider>
  );
}

// --- Helper: supprime les zéros à gauche
// Ex: "0007" -> "7", "C003" -> "C3"
function normalizeNumero(raw) {
  if (raw == null) return '';
  const s = String(raw);
  if (/^C/i.test(s)) {
    const num = s.replace(/^C/i, '').replace(/^0+/, '');
    return 'C' + (num === '' ? '0' : num);
  }
  const n = s.replace(/^0+/, '');
  return n === '' ? '0' : n;
}

function ViewDevisPage() {
  const [devisData, setDevisData] = useState(null); // { ... , lignes:[], numero? }
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const pdfRef = useRef(null);
  const navigate = useNavigate();

  // UI/flow
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStep, setProgressStep] = useState('');
  const toast = useToast();

  // Idempotence (si géré côté backend)
  const idemKeyRef = useRef(
    (globalThis.crypto?.randomUUID?.() || (Date.now() + '-' + Math.random()))
  );

  // ---------- Utils ----------
  const num = (v) => Number(String(v ?? 0).toString().replace(',', '.')) || 0;
  const euro = (v) =>
    num(v).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  const calcHT = (l) => (num(l?.qty) * num(l?.unitPrice));

  // ---------- Chargement depuis localStorage ----------
  useEffect(() => {
    try {
      const raw = localStorage.getItem('devis-preview');
      if (raw) setDevisData(JSON.parse(raw));
    } catch {
      setDevisData(null);
    }
  }, []);

  // Logo -> dataURL (pour être sûr qu’il s’intègre dans le PDF)
  useEffect(() => {
    const toDataURL = async (path) => {
      try {
        const res = await fetch(path);
        const blob = await res.blob();
        return await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      } catch {
        return null;
      }
    };
    toDataURL('/pneuslogos.PNG').then(setLogoDataUrl);
  }, []);

  // ---------- Impression “fallback navigateur” ----------
  const startPrintMode = () => document.body.classList.add('printing-devis');
  const stopPrintMode  = () => document.body.classList.remove('printing-devis');

  const handlePrintOnly = () => {
    startPrintMode();
    setTimeout(() => {
      window.print();
      setTimeout(stopPrintMode, 300);
    }, 50);
  };

  if (!devisData) return <p>Chargement des données…</p>;

  // ---------- Totaux ----------
  const remise = num(devisData.remise);
  const totalHT = (devisData.lignes ?? []).reduce((s, l) => s + calcHT(l), 0);
  const totalHTRemise = totalHT - remise;
  const totalTVA = (devisData.lignes ?? []).reduce((sum, l) => {
    const part = totalHT === 0 ? 0 : calcHT(l) / totalHT;
    const lineRemise = remise * part;
    const lineHTAfter = calcHT(l) - lineRemise;
    return sum + (lineHTAfter * num(l?.vat)) / 100;
  }, 0);
  const totalTTC = totalHTRemise + totalTVA;

  // ---------- Génération PDF (même logique que facture) ----------
  const generateAndSaveElectronPDF = async (filename) => {
    // Si l’API n’existe pas, fallback navigateur
    if (!window?.electronAPI?.saveHTMLAsPDF) {
      handlePrintOnly();
      return true;
    }
    try {
      // 1) HTML de la zone
      const contentNode = document.querySelector('.preview-body');
      const contentHTML = contentNode ? contentNode.outerHTML : '<div/>';

      // 2) CSS inline (rapide)
      let inlineCSS = '';
      document.querySelectorAll('style').forEach((s) => { inlineCSS += s.innerHTML || ''; });

      // 3) HTML autonome
      const html = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>PDF</title>
    <style>
      @page { size: A4; margin: 0; }
      html, body {
        margin: 0; padding: 0; background: #fff !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .preview-body { width: 210mm !important; min-height: 297mm !important; margin: 0 !important; overflow: hidden !important; }
      ${inlineCSS}
    </style>
  </head>
  <body>
    ${contentHTML}
  </body>
</html>`;

      setProgress(75); setProgressStep('Génération du PDF…');
      const res = await window.electronAPI.saveHTMLAsPDF({
        type: 'devis',
        fileName: filename,
        html
      });

      if (!res?.success) {
        toast.error('Erreur PDF : ' + (res?.error || 'inconnue'));
        return false;
      }
      setProgress(90); setProgressStep('Finalisation…');
      return true;
    } catch (err) {
      console.error('Electron API non disponible :', err);
      toast.error('Electron API non disponible.');
      return false;
    }
  };

  // ---------- Enregistrement complet ----------
  const saveDevis = async () => {
    if (saving) return;
    if (!devisData.clientId || !(devisData.lignes ?? []).length) {
      toast.error('Données incomplètes (client ou lignes).');
      return;
    }

    const payload = {
      client_id: devisData.clientId,
      immatriculation: devisData.immatriculation ?? '',
      kilometrage: devisData.kilometrage ?? '',
      date_devis: devisData.dateDevis ?? '',
      montant_ttc: totalTTC,
      statut: 'normal',
      lignes: (devisData.lignes ?? []).map((l) => ({
        reference: l?.ref ?? '',
        description: l?.designation ?? '',
        quantite: num(l?.qty),
        prix_unitaire: num(l?.unitPrice),
        tva: num(l?.vat),
        total_ht: calcHT(l),
      })),
    };

    try {
      setSaving(true);
      setProgress(10); setProgressStep('Préparation des données…');

      const token = localStorage.getItem('token');
      setProgress(35); setProgressStep('Enregistrement en base…');

      const { data } = await axios.post(
        'http://localhost:4000/api/devis/complete',
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Idempotency-Key': idemKeyRef.current, // inoffensif si pas géré côté backend
          }
        }
      );

      // Le backend peut renvoyer un numéro paddé -> on le normalise
      const numeroRaw = data?.numero;
      if (!numeroRaw) {
        toast.error('Numéro de devis non retourné par le serveur.');
        setSaving(false);
        return;
      }
      const numero = normalizeNumero(numeroRaw);

      // ✅ Affiche le numéro tout de suite (sans zéros)
      setDevisData((prev) => ({ ...prev, numero }));

      // ✅ Attendre la peinture DOM (double RAF)
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

      // ✅ Patch DOM au cas où
      const spanNumero = document.querySelector('[data-role="numero-devis"]');
      if (spanNumero && (!spanNumero.textContent || /attribuer/i.test(spanNumero.textContent))) {
        spanNumero.textContent = numero;
      }

      // Génère et enregistre le PDF (nom de fichier sans zéros à gauche)
      const ok = await generateAndSaveElectronPDF(`devis_${numero}.pdf`);
      if (!ok) {
        toast.error('PDF non généré. Le devis est enregistré.');
        setSaving(false);
        return;
      }

      setProgress(100); setProgressStep('Terminé !');
      toast.success(`Devis ${numero} enregistré avec succès.`);
      localStorage.removeItem('devis-preview');

      await new Promise(r => setTimeout(r, 400));
      // ✅ Redirection vers la liste des devis
      navigate('/app/devis/liste');
    } catch (error) {
      console.error('Erreur enregistrement :', error?.response?.data || error);
      toast.error('Erreur lors de l’enregistrement.');
    } finally {
      setSaving(false);
      setProgress(0);
      setProgressStep('');
    }
  };

  return (
    <div className="preview-container">
      {/* Overlay progression */}
      <ProgressOverlay
        open={saving}
        progress={progress}
        title="Enregistrement du devis"
        subtitle={progressStep}
      />

      <button
        onClick={() => navigate('/app/devis/nouvelle')}
        className="btn-retour-haut"
        disabled={saving}
      >
        ⬅ Retour
      </button>

      {/* IMPORTANT : utilisé par la capture PDF */}
      <div id="print-root-devis" className="preview-body" ref={pdfRef}>
        {/* En-tête */}
        <div className="facture-header-line">
          <div className="header-left">
            <img src={logoDataUrl || '/pneuslogos.PNG'} alt="Logo" className="logo" />
            <div className="societe-info">
              <h2>Rouen Pneu 76</h2>
              <p>
                205 Avenue du 14 Juillet<br />
                76300 Sotteville-lès-Rouen<br />
                FR408944836972<br />
                Tél : 07 49 91 04 30<br />
                Pneurouen@gmail.com
              </p>
            </div>
          </div>

          <div className="header-right">
            <div className="facture-top-right">
              <div className="facture-label-barre">
                DEVIS N°{' '}
                <span
                  data-role="numero-devis"
                  style={!devisData?.numero ? { marginLeft: 6, fontStyle: 'italic', color: '#888' } : undefined}
                >
                  {devisData?.numero || 'À attribuer à l’enregistrement'}
                </span>
              </div>
              <div className="facture-date">Date : {devisData.dateDevis || '-'}</div>
            </div>

            <div className="client-info-box">
              <div><span className="label">Nom du client :</span><span className="value">{devisData.clientNom || '-'}</span></div>
              <div><span className="label">Adresse :</span><span className="value">{devisData.clientAdresse || '-'}</span></div>
              <div><span className="label">Ville / CP :</span><span className="value">{devisData.clientVilleCodePostal || '-'}</span></div>
              <div><span className="label">Téléphone :</span><span className="value">{devisData.clientTelephone || '-'}</span></div>
              <div><span className="label">Immatriculation :</span><span className="value">{devisData.immatriculation || '-'}</span></div>
              <div><span className="label">Kilométrage :</span><span className="value">{devisData.kilometrage || '-'}</span></div>
            </div>
          </div>
        </div>

        <div className="separator-line" />

        {/* Tableau */}
        <table className="facture-table">
          <thead>
            <tr>
              <th>Désignation</th>
              <th>Quantité</th>
              <th>PU HT</th>
              <th>TVA</th>
              <th>Total HT</th>
            </tr>
          </thead>
          <tbody>
            {(devisData.lignes ?? []).map((ligne, i) => (
              <tr key={i}>
                <td>{ligne?.designation || '-'}</td>
                <td>{num(ligne?.qty)}</td>
                <td>{euro(ligne?.unitPrice)}</td>
                <td>{num(ligne?.vat)} %</td>
                <td>{euro(calcHT(ligne))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totaux */}
        <div className="totaux-grid">
          <div className="left-column">
            <p><strong>Conditions de paiement : {devisData.conditionsReglement ?? '-'}</strong></p>
            <p><strong>Mode de paiement : {devisData.modePaiement ?? '-'}</strong></p>
          </div>
          <div className="right-column">
            {remise > 0 && (<div className="ligne-total"><span>Remise</span><span>-{euro(remise)}</span></div>)}
            <div className="ligne-total"><span><strong>Total H.T</strong></span><span>{euro(totalHTRemise)}</span></div>
            <div className="ligne-total"><span>T.V.A</span><span>{euro(totalTVA)}</span></div>
            <div className="ttc-box-bordered"><span>TOTAL T.T.C</span><span>{euro(totalTTC)}</span></div>
          </div>
        </div>

        {/* Footer */}
        <div className="footer">
          <p><strong>Nous vous remercions pour votre confiance</strong></p>
          <p><em>L’équipe O’Pneu Rouen</em></p>
          <p>SAS au capital de 1000€ – Siret 984 436 972 00017</p>
          <p>N° TVA Intracommunautaire : FR40984436972</p>
          <div className="bottom-red-line"></div>
        </div>
      </div>

      <div className="preview-footer">
        <button className="btn btn-primary" onClick={saveDevis} disabled={saving}>
          {saving ? '⏳ Enregistrement…' : '✅ Enregistrer dans la base'}
        </button>
        <button className="btn btn-light" onClick={handlePrintOnly} disabled={saving}>
          🖨️ Imprimer
        </button>
      </div>
    </div>
  );
}
