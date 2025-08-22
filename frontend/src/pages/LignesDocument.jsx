import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './LignesFacture.css';

export default function LignesDocument() {
  const { id, type } = useParams(); // 'factures' | 'devis'
  const navigate = useNavigate();

  const [lignes, setLignes] = useState([]);
  const [header, setHeader] = useState(null);
  const [loading, setLoading] = useState(true);

  const base = 'http://localhost:4000/api';
  const lignesUrl = `${base}/${type}/${id}/lignes`;
  const headerUrl = type === 'factures' ? `${base}/factures/${id}` : `${base}/devis/${id}`;
  // On garde pdfUrl/regenUrl pour le fallback web et pour déclencher la régénération côté back si tu l'as
  const pdfUrl    = type === 'factures' ? `${base}/factures/${id}/pdf` : `${base}/devis/${id}/pdf`;
  const regenUrl  = type === 'factures' ? `${base}/factures/${id}/pdf/regenerate` : `${base}/devis/${id}/pdf/regenerate`;

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }
    const headers = { Authorization: `Bearer ${token}` };

    (async () => {
      setLoading(true);
      try {
        const [lignesRes, headerRes] = await Promise.allSettled([
          axios.get(lignesUrl, { headers }),
          axios.get(headerUrl, { headers }),
        ]);

        setLignes(lignesRes.status === 'fulfilled' && Array.isArray(lignesRes.value.data) ? lignesRes.value.data : []);
        setHeader(headerRes.status === 'fulfilled' ? (headerRes.value.data || null) : null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, type, navigate, lignesUrl, headerUrl]);

  const euro = (n) =>
    (Number(n || 0)).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

  const { totalHT, totalTVA, totalTTC } = useMemo(() => {
    const lineHTs = (lignes || []).map((l) => {
      const q = Number(l.quantite ?? 0);
      const pu = Number(l.prix_unitaire ?? 0);
      return Number(l.total_ht ?? q * pu) || 0;
    });
    const _totalHT = lineHTs.reduce((s, v) => s + v, 0);
    const remiseGlobale = Number(header?.remise ?? 0);
    const baseApresRemise = _totalHT - remiseGlobale;

    let _totalTVA = 0;
    (lignes || []).forEach((l, i) => {
      const lineHT = lineHTs[i] || 0;
      const part = _totalHT > 0 ? lineHT / _totalHT : 0;
      const lineRemise = remiseGlobale * part;
      const baseHTAfter = lineHT - lineRemise;
      _totalTVA += baseHTAfter * (Number(l.tva ?? 0) / 100);
    });

    const _totalTTC = baseApresRemise + _totalTVA;
    return { totalHT: _totalHT, totalTVA: _totalTVA, totalTTC: _totalTTC };
  }, [lignes, header]);

  const title = type === 'factures' ? 'Facture' : 'Devis';

  /* ------------------------- Helpers PDF ------------------------- */

  // Nom de fichier tel qu'enregistré par Electron dans Documents/gestion/...
  const savedPdfInfo = () => {
    const numero = header?.numero ?? id; // ex: "008"
    // déduis le type de classement Electron: 'facture' | 'facture_cacher' | 'devis'
    let saveType = 'facture';
    if (type !== 'factures') saveType = 'devis';
    // si tu as un champ header.type ('facture-cachee'), décommente :
    // if (String(header?.type || '').includes('cache')) saveType = 'facture_cacher';
    const fileName = `${saveType === 'devis' ? 'devis' : 'facture'}_${numero}.pdf`;
    return { saveType, fileName };
  };

  // Ouverture via Electron (ou fallback web si pas Electron)
  const openSavedWithElectronOrFallback = async () => {
    const token = localStorage.getItem('token');
    const { saveType, fileName } = savedPdfInfo();

    // 1) Essayer Electron (chemin reconstruit côté main) :
    if (window.electronAPI?.openSavedPdf) {
      const r = await window.electronAPI.openSavedPdf({ type: saveType, fileName });
      if (r?.ok) return; // ouvert dans une fenêtre Electron
      // si pas trouvé sur disque, on retombe sur le fallback web ci-dessous
    }

    // 2) Fallback web : on va chercher le PDF via l'API (si route existante)
    try {
      const res = await axios.get(pdfUrl, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      console.error('Ouverture PDF (fallback web) échouée', e);
      alert("Impossible d’ouvrir le PDF (ni via Electron, ni via l’API).");
    }
  };

  // Ouvrir SANS régénérer
  const openPdf = openSavedWithElectronOrFallback;

  // Régénérer PUIS ouvrir
  const regeneratePdf = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // 1) On tente la régénération côté backend (si tu as implémenté la route)
      //    NB : si tu généreras plutôt côté Electron ailleurs, cette ligne peut rester,
      //    elle ne cassera rien même si la route répond 404.
      await axios.post(regenUrl, null, { headers }).catch(() => { /* ignore si pas de route */ });

      // 2) Ouvrir la version enregistrée (Electron) OU fallback API/web
      await openSavedWithElectronOrFallback();
    } catch (e) {
      console.error('Régénération/Ouverture PDF échouée', e);
      alert('Impossible de régénérer/ouvrir le PDF.');
    }
  };

  return (
    <div className="ld-page pro">
      <div className="ld-header">
        <button className="btn-retour-ghost" onClick={() => navigate(-1)}>
          <i className="fas fa-arrow-left"></i> Retour
        </button>

        <h2 className="ld-title">Détails du {title}</h2>

        <div className="ld-actions">
          <button className="btn btn-primary" onClick={regeneratePdf}>
            <i className="fas fa-sync-alt" /> Régénérer PDF
          </button>
          {/* Bouton optionnel : juste ouvrir sans régénérer */}
          {/* <button className="btn btn-outline" onClick={openPdf}>
            <i className="fas fa-file-pdf" /> Ouvrir PDF
          </button> */}
        </div>
      </div>

      <div className="ld-subheader">
        <div className="ld-meta-left">
          <span className={`pill pill-${type === 'factures' ? 'blue' : 'purple'}`}>
            {title.toUpperCase()}
          </span>
          {header?.numero && <span className="meta-item">N° {header.numero}</span>}
          {header?.date_facture && (
            <span className="meta-item">Date : {new Date(header.date_facture).toLocaleDateString()}</span>
          )}
          {header?.date_devis && (
            <span className="meta-item">Date : {new Date(header.date_devis).toLocaleDateString()}</span>
          )}
        </div>

        <div className="ld-totaux-mini">
          <div className="mini-row"><span>Total H.T</span><strong>{euro(totalHT)}</strong></div>
          {Number(header?.remise ?? 0) > 0 && (
            <div className="mini-row"><span>Remise globale</span><strong>-{euro(header.remise)}</strong></div>
          )}
          <div className="mini-row"><span>TVA totale</span><strong>{euro(totalTVA)}</strong></div>
          <div className="mini-ttc"><span>TOTAL T.T.C</span><strong>{euro(totalTTC)}</strong></div>
        </div>
      </div>

      <div className="ld-grid">
        <div className="ld-card">
          <div className="ld-table-wrap">
            <table className="ld-table">
              <thead>
                <tr>
                  <th>Réf</th>
                  <th>Description</th>
                  <th className="th-num">Qté</th>
                  <th className="th-num">PU HT</th>
                  <th className="th-num">TVA</th>
                  <th className="th-num">Total HT</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-4">Chargement…</td></tr>
                ) : (lignes || []).length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-4">Aucune ligne trouvée.</td></tr>
                ) : (
                  (lignes || []).map((l, i) => {
                    const q = Number(l.quantite ?? 0);
                    const pu = Number(l.prix_unitaire ?? 0);
                    const lineTotal = Number(l.total_ht ?? (q * pu));
                    return (
                      <tr key={i}>
                        <td className="muted">{l.reference || '-'}</td>
                        <td className="desc">{l.description || '-'}</td>
                        <td className="num">{q}</td>
                        <td className="num">{euro(pu)}</td>
                        <td className="num">{Number(l.tva ?? 0)} %</td>
                        <td className="num">{euro(lineTotal)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="ld-side">
          <div className="ld-summary">
            <div className="sum-row"><span>Total H.T</span><strong>{euro(totalHT)}</strong></div>
            {Number(header?.remise ?? 0) > 0 && (
              <>
                <div className="sum-row"><span>Remise globale</span><strong>-{euro(header.remise)}</strong></div>
                <div className="sum-row"><span>Base H.T après remise</span><strong>{euro(totalHT - Number(header.remise))}</strong></div>
              </>
            )}
            <div className="sum-row"><span>TVA totale</span><strong>{euro(totalTVA)}</strong></div>
            <div className="sum-row ttc"><span>TOTAL T.T.C</span><strong>{euro(totalTTC)}</strong></div>
          </div>
        </aside>
      </div>
    </div>
  );
}
