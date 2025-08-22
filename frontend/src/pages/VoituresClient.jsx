import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './VoitureClient.css';

const VoituresClient = () => {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [voitures, setVoitures] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // 🔐 Récupération voitures + infos client
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };

    setLoading(true);

    Promise.all([
      axios.get(`http://localhost:4000/api/clients/${id}`, { headers }),
      axios.get(`http://localhost:4000/api/clients/${id}/voitures`, { headers }),
    ])
      .then(([c, v]) => {
        setClient(c.data ?? null);
        setVoitures(Array.isArray(v.data) ? v.data : []);
      })
      .catch((err) => {
        console.error("Erreur chargement client/voitures :", err);
        setClient(null);
        setVoitures([]);
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const Badge = ({ children, tone = "neutral" }) => (
    <span className={`badge tone-${tone}`}>{children}</span>
  );

  return (
    <div className="vc-wrap">
      {/* Barre d’action */}
      <div className="vc-bar">
        <button className="btn-ghost" onClick={() => navigate('/app/clients/liste')}>
          <i className="fas fa-arrow-left" /> Retour
        </button>
      </div>

      {/* En-tête */}
      <div className="card vc-header">
        <h1>Véhicules du client</h1>
        {client ? (
          <p className="vc-client-name">
            <i className="fas fa-user" /> {client.nom} {client.prenom}
          </p>
        ) : (
          <p>Client #{id}</p>
        )}
      </div>

      {/* Tableau voitures */}
      <div className="card">
        <div className="card-head">
          <h2><i className="fas fa-car" /> Liste des véhicules</h2>
          <Badge tone="neutral">{voitures.length}</Badge>
        </div>

        {loading ? (
          <div className="vc-skeleton">
            <div className="sk-row" />
            <div className="sk-row" />
            <div className="sk-row" />
          </div>
        ) : voitures.length === 0 ? (
          <div className="vc-empty">
            <i className="fas fa-info-circle" />
            <p>Aucune voiture trouvée pour ce client.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="vc-table">
              <thead>
                <tr>
                  <th>Immatriculation</th>
                  <th>Kilométrage</th>
                  <th className="center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {voitures.map((voiture) => (
                  <tr key={voiture.id}>
                    <td className="fw">{voiture.immatriculation}</td>
                    <td>{voiture.kilometrage ?? '-'}</td>
                    <td className="center actions">
                      <button
                        className="btn-ic"
                        onClick={() => navigate(`/app/voitures/${voiture.id}/documents`)}
                        title="Voir factures & devis"
                      >
                        <i className="fas fa-folder-open" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoituresClient;
