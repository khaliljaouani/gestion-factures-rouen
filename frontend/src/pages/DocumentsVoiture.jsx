import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './VoitureDocumentsPage.css';

const fmtDate = (v) => (v ? new Date(v).toLocaleDateString('fr-FR') : '-');
const fmtEuro = (n) =>
  (Number(n || 0)).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

export default function VoitureDocumentsPage() {
  const { id } = useParams(); // ID de la voiture
  const navigate = useNavigate();

  const [voiture, setVoiture] = useState(null);
  const [factures, setFactures] = useState([]);
  const [devis, setDevis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };

    setLoading(true);
    setErr('');

    Promise.all([
      axios.get(`http://localhost:4000/api/voitures/${id}`, { headers }),
      axios.get(`http://localhost:4000/api/voitures/${id}/factures`, { headers }),
      axios.get(`http://localhost:4000/api/voitures/${id}/devis`, { headers }),
    ])
      .then(([v, f, d]) => {
        setVoiture(v.data ?? null);
        setFactures(Array.isArray(f.data) ? f.data : []);
        setDevis(Array.isArray(d.data) ? d.data : []);
      })
      .catch((e) => {
        console.error('Erreur chargement documents voiture :', e);
        if (e?.response?.status === 401) navigate('/login');
        setErr("Impossible de charger les documents de ce véhicule.");
        setVoiture(null);
        setFactures([]);
        setDevis([]);
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const Badge = ({ children, tone = 'info' }) => (
    <span className={`badge tone-${tone}`}>{children}</span>
  );

  return (
    <div className="vd-wrap">
      {/* Barre d’action */}
      <div className="vd-bar">
        <button className="btn-ghost" onClick={() => navigate(`/app/clients/${voiture?.client_id}/voitures`)}>
          <i className="fas fa-arrow-left" /> Retour
        </button>
        <div className="vd-breadcrumb">
          <span>Clients</span>
          <i className="fas fa-chevron-right sep" />
          <span>Véhicules</span>
          <i className="fas fa-chevron-right sep" />
          <strong>Documents</strong>
        </div>
      </div>

      {/* En-tête / Info véhicule */}
      <div className="vd-header card">
        <div className="vd-title">
          <h1>Documents du véhicule</h1>
          <Badge tone="primary">ID #{id}</Badge>
        </div>

        {voiture ? (
          <div className="vd-meta">
            <div className="meta-item">
              <div className="meta-label">Immatriculation</div>
              <div className="meta-value">{voiture.immatriculation || '-'}</div>
            </div>
            <div className="meta-item">
              <div className="meta-label">Kilométrage</div>
              <div className="meta-value">{voiture.kilometrage ?? '-'}</div>
            </div>
            <div className="meta-item">
              <div className="meta-label">Documents</div>
              <div className="meta-value">
                <Badge tone="neutral">{factures.length} facture(s)</Badge>
                <Badge tone="neutral">{devis.length} devis</Badge>
              </div>
            </div>
          </div>
        ) : (
          <div className="vd-meta">
            <div className="meta-item">
              <div className="meta-label">Véhicule</div>
              <div className="meta-value">-</div>
            </div>
          </div>
        )}
      </div>

      {err && <div className="card vd-alert">{err}</div>}

      {/* Grille 2 colonnes */}
      <div className="vd-grid">
        {/* FACTURES */}
        <div className="card">
          <div className="card-head">
            <h2><i className="fas fa-file-invoice" /> Factures</h2>
            <Badge tone="neutral">{factures.length}</Badge>
          </div>

          {loading ? (
            <div className="vd-skeleton">
              <div className="sk-row" />
              <div className="sk-row" />
              <div className="sk-row" />
            </div>
          ) : factures.length === 0 ? (
            <div className="vd-empty">
              <i className="far fa-folder-open" />
              <p>Aucune facture trouvée pour ce véhicule.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="vd-table">
                <thead>
                  <tr>
                    <th>Numéro</th>
                    <th>Date</th>
                    <th className="num">Remise</th>
                    <th className="num">Total TTC</th>
                    <th>Statut</th>
                    <th className="center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {factures.map((f) => (
                    <tr key={`facture-${f.id}`}>
                      <td className="fw">{f.numero || '-'}</td>
                      <td>{fmtDate(f.date_facture)}</td>
                      <td className="num">{fmtEuro(f.remise)}</td>
                      <td className="num">{fmtEuro(f.montant_ttc)}</td>
                      <td>
                        <Badge tone={String(f.statut).toLowerCase() === 'cachee' ? 'warning' : 'success'}>
                          {f.statut || '-'}
                        </Badge>
                      </td>
                      <td className="center actions">
                        <button
                          className="btn-ic"
                          title="Voir les lignes"
                          onClick={() => navigate(`/app/documents/factures/${f.id}/lignes`)}
                        >
                          <i className="fas fa-eye" />
                        </button>
                        <a
                          className="btn-ic"
                          title="PDF"
                          href={`http://localhost:4000/api/factures/${f.id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <i className="fas fa-file-pdf" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* DEVIS */}
        <div className="card">
          <div className="card-head">
            <h2><i className="far fa-file-alt" /> Devis</h2>
            <Badge tone="neutral">{devis.length}</Badge>
          </div>

          {loading ? (
            <div className="vd-skeleton">
              <div className="sk-row" />
              <div className="sk-row" />
              <div className="sk-row" />
            </div>
          ) : devis.length === 0 ? (
            <div className="vd-empty">
              <i className="far fa-folder-open" />
              <p>Aucun devis trouvé pour ce véhicule.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="vd-table">
                <thead>
                  <tr>
                    <th>Numéro</th>
                    <th>Date</th>
                    <th className="num">Total TTC</th>
                    <th>Statut</th>
                    <th className="center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {devis.map((d) => (
                    <tr key={`devis-${d.id}`}>
                      <td className="fw">{d.numero || '-'}</td>
                      <td>{fmtDate(d.date_devis)}</td>
                      <td className="num">{fmtEuro(d.montant_ttc)}</td>
                      <td>
                        <Badge tone="info">{d.statut || '-'}</Badge>
                      </td>
                      <td className="center actions">
                        <button
                          className="btn-ic"
                          title="Voir les lignes"
                          onClick={() => navigate(`/app/documents/devis/${d.id}/lignes`)}
                        >
                          <i className="fas fa-eye" />
                        </button>
                        {/* Lien PDF devis si dispo côté backend */}
                        {/* <a className="btn-ic" href={`http://localhost:4000/api/devis/${d.id}/pdf`} target="_blank" rel="noreferrer">
                          <i className="fas fa-file-pdf" />
                        </a> */}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Pied de page / raccourcis */}
      <div className="vd-footer-actions">
        <Link to="/app/factures/nouvelle" className="btn-primary">
          <i className="fas fa-plus-circle" /> Nouvelle facture
        </Link>
        <Link to="/app/devis/nouvelle" className="btn-outline">
          <i className="fas fa-plus" /> Nouveau devis
        </Link>
      </div>
    </div>
  );
}
