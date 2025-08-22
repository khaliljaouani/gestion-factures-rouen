import React, { useEffect, useRef, useState } from 'react';
import './FacturePreview.css';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import ProgressOverlay from '../components/ProgressOverlay';
import { ToastProvider, useToast } from '../components/ToastProvider';

// ----- Export par défaut avec Provider (toasts dispo partout dans la page)
export default function FacturePreviewPageWithProviders() {
  return (
    <ToastProvider>
      <FacturePreviewPage />
    </ToastProvider>
  );
}

function FacturePreviewPage() {
  const [factureData, setFactureData] = useState(null);
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const pdfRef = useRef(null);
  const navigate = useNavigate();

  // UI/flow
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStep, setProgressStep] = useState('');
  const toast = useToast();

  // Clé d’idempotence (même clic => même facture côté backend)
  const idemKeyRef = useRef(
    (globalThis.crypto?.randomUUID?.() || (Date.now() + '-' + Math.random()))
  );

  // Charger données facture depuis localStorage
  useEffect(() => {
    const raw = localStorage.getItem('facture-preview');
    if (!raw) return;
    try {
      setFactureData(JSON.parse(raw));
    } catch {
      setFactureData(null);
    }
  }, []);

  // Logo -> dataURL (évite problèmes de ressource lors de la capture PDF)
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

  // Empêcher fermeture onglet pendant enregistrement
  useEffect(() => {
    const handler = (e) => {
      if (saving) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [saving]);

  if (!factureData) return <p>Chargement des données…</p>;

  // ---------- helpers ----------
  const euro = (v) =>
    Number(v || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  const n = (x) => Number((x ?? 0).toString().replace(',', '.')) || 0;
  const calcHT = (l) => n(l.qty) * n(l.unitPrice);

  const remise = n(factureData.remise);
  const lignes = Array.isArray(factureData.lignes) ? factureData.lignes : [];

  const totalHT = lignes.reduce((sum, l) => sum + calcHT(l), 0);
  const totalHTRemise = totalHT - remise;
  const totalTVA = lignes.reduce((sum, l) => {
    const part = totalHT === 0 ? 0 : calcHT(l) / totalHT;
    const lineRemise = remise * part;
    const lineHTAfter = calcHT(l) - lineRemise;
    return sum + (lineHTAfter * n(l.vat)) / 100;
  }, 0);
  const totalTTC = totalHTRemise + totalTVA;

  // --------- Génération PDF via Electron (optimisée) ---------
  const generateAndDownloadPDF = async (filename) => {
    try {
      const type = factureData.isHidden ? 'facture-cachee' : 'facture';

      // 1) HTML de la zone facture
      const contentNode = document.querySelector('.preview-body');
      const contentHTML = contentNode ? contentNode.outerHTML : '<div/>';

      // 2) CSS inline (rapide) : uniquement les <style> injectés par Vite/ton app
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
      .preview-body {
        width: 210mm !important;
        min-height: 297mm !important;
        margin: 0 !important;
        overflow: hidden !important;
      }
      ${inlineCSS}
    </style>
  </head>
  <body>
    ${contentHTML}
  </body>
</html>`;

      const res = await window.electronAPI.saveHTMLAsPDF({
        type,
        fileName: filename,
        html
      });

      if (!res?.success) {
        toast.error('Erreur PDF : ' + (res?.error || 'inconnue'));
        return false;
      }
      console.log('📄 PDF sauvegardé :', res.path);
      return true;
    } catch (err) {
      console.error('❌ Electron API non disponible :', err);
      toast.error('Electron API non disponible.');
      return false;
    }
  };

  const handlePrintOnly = () => window.print();

  const saveFacture = async () => {
    if (saving) return; // anti double-clic
    if (!factureData.clientId) return toast.error('Client non sélectionné.');
    if (!lignes.length) return toast.error('Aucune ligne.');

    const voiture = {
      immatriculation: factureData.immatriculation ?? '',
      kilometrage: factureData.kilometrage ?? '',
      client_id: factureData.clientId,
    };

    const facture = {
      date_facture: factureData.dateFacture ?? '',
      montant_ttc: totalTTC,
      remise: remise,
      statut: factureData.isHidden ? 'cachee' : 'normale',
    };

    const lignesPayload = lignes.map((ligne) => ({
      reference: (ligne?.ref || '').trim(),
      description: (ligne?.designation || '').trim(),
      quantite: n(ligne?.qty),
      prix_unitaire: n(ligne?.unitPrice),
      tva: n(ligne?.vat),
      total_ht: calcHT(ligne),
    }));

    const payload = { voiture, facture, lignes: lignesPayload };

    try {
      setSaving(true);
      setProgress(10); setProgressStep('Préparation des données…');

      const token = localStorage.getItem('token');
      setProgress(35); setProgressStep('Enregistrement en base…');
      const { data } = await axios.post(
        'http://localhost:4000/api/factures/complete',
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Idempotency-Key': idemKeyRef.current, // backend idempotent
          },
        }
      );

      const numero = data?.numero;
      if (!numero) {
        toast.error('Numéro non retourné par le serveur.');
        setSaving(false);
        return;
      }

      // Mets à jour l'UI
      setFactureData((prev) => ({ ...prev, numero }));

      // Attendre la peinture DOM (double RAF)
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

      // Ceinture/bretelles : si “à attribuer…”, on remplace directement le texte
      const spanNumero = document.querySelector('[data-role="numero"]');
      if (spanNumero && (!spanNumero.textContent || /attribuer/i.test(spanNumero.textContent))) {
        spanNumero.textContent = numero;
      }

      // Génération PDF
      setProgress(75); setProgressStep('Génération du PDF…');
      const ok = await generateAndDownloadPDF(`facture_${numero}.pdf`);
      if (!ok) {
        toast.error('PDF non généré. La facture est enregistrée en base.');
        setSaving(false);
        return;
      }

      setProgress(100); setProgressStep('Terminé !');
      toast.success(`Facture ${numero} enregistrée avec succès.`);
      localStorage.removeItem('facture-preview');

      // petite pause pour voir 100%
      await new Promise(r => setTimeout(r, 400));
      navigate('/app/factures/liste');
    } catch (error) {
      console.error('❌ Erreur enregistrement :', error?.response?.data || error?.message);
      toast.error('Erreur lors de l’enregistrement.');
    } finally {
      setSaving(false);
      setProgress(0);
      setProgressStep('');
    }
  };

  return (
    <div className="preview-container">
      {/* Overlay de progression */}
      <ProgressOverlay
        open={saving}
        progress={progress}
        title="Enregistrement de la facture"
        subtitle={progressStep}
      />

      <button onClick={() => navigate('/app/factures/nouvelle')} className="btn-retour-haut no-print" disabled={saving}>
        ⬅ Retour
      </button>

      <div className="preview-body" ref={pdfRef}>
        <div className="facture-header-line">
          <div className="header-left">
            {/* logo en base64 */}
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
                FACTURE {factureData.isHidden ? 'CACHÉE ' : ''}N°{' '}
                <span
                  data-role="numero"
                  style={!factureData.numero ? { marginLeft: 6, fontStyle: 'italic', color: '#888' } : undefined}
                >
                  {factureData.numero || "À attribuer à l’enregistrement"}
                </span>
              </div>
              <div className="facture-date">Date : {factureData.dateFacture || '-'}</div>
            </div>
            <div className="client-info-box">
              <div><span className="label">Nom du client :</span> <span className="value">{factureData.clientNom || '-'}</span></div>
              <div><span className="label">Adresse :</span> <span className="value">{factureData.clientAdresse || '-'}</span></div>
              <div><span className="label">Ville/Code postal :</span> <span className="value">{factureData.clientVilleCodePostal || '-'}</span></div>
              <div><span className="label">Téléphone :</span> <span className="value">{factureData.clientTelephone || '-'}</span></div>
              <div><span className="label">Immatriculation :</span> <span className="value">{factureData.immatriculation || '-'}</span></div>
              <div><span className="label">Kilométrage :</span> <span className="value">{factureData.kilometrage || '-'}</span></div>
            </div>
          </div>
        </div>

        <div className="separator-line" />

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
            {lignes.map((ligne, i) => (
              <tr key={i}>
                <td>{ligne?.designation || '-'}</td>
                <td>{n(ligne?.qty)}</td>
                <td>{euro(n(ligne?.unitPrice))}</td>
                <td>{n(ligne?.vat)} %</td>
                <td>{euro(calcHT(ligne))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="totaux-grid">
          <div className="left-column">
            <p><strong>Conditions de paiement : {factureData.conditionsReglement || '-'}</strong></p>
            <p><strong>Méthodes de paiement : {factureData.modePaiement || '-'}</strong></p>
          </div>
          <div className="right-column">
            {remise > 0 && <div className="ligne-total"><span>Remise</span><span>-{euro(remise)}</span></div>}
            <div className="ligne-total"><span><strong>Total H.T</strong></span><span>{euro(totalHTRemise)}</span></div>
            <div className="ligne-total"><span>T.V.A</span><span>{euro(totalTVA)}</span></div>
            <div className="ttc-box-bordered"><span>TOTAL T.T.C</span><span>{euro(totalTTC)}</span></div>
          </div>
        </div>

        <div className="footer">
          <p><strong>Nous vous remercions pour votre confiance</strong></p>
          <p><em>L'équipe O’Pneu Rouen</em></p>
          <p>SAS au capital de 1000€ – Siret 984 436 972 00017</p>
          <p>N° TVA Intracommunautaire : FR40984436972</p>
          <div className="bottom-red-line" />
        </div>
      </div>

      <div className="preview-actions no-print">
        <button className="btn btn-primary" onClick={saveFacture} disabled={saving}>
          {saving ? '⏳ Enregistrement…' : '✅ Enregistrer'}
        </button>
        <button className="btn btn-light" onClick={handlePrintOnly} disabled={saving}>
          🖨️ Imprimer
        </button>
      </div>
    </div>
  );
}
