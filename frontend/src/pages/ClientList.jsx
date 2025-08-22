import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import ModalModifierClient from '../components/ModalModifierClient';
import './ListeClients.css';

export default function ListeClients() {
  const [clients, setClients] = useState([]);
  const [q, setQ] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [clientToEdit, setClientToEdit] = useState(null);
  const navigate = useNavigate();

  const fetchClients = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get('http://localhost:4000/api/clients', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClients(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Erreur chargement clients', e);
      setClients([]);
    }
  };
  useEffect(() => { fetchClients(); }, []);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return clients;
    return clients.filter(c =>
      (c.nom || '').toLowerCase().includes(s) ||
      (c.prenom || '').toLowerCase().includes(s) ||
      (c.email || '').toLowerCase().includes(s) ||
      (c.telephone || '').toLowerCase().includes(s)
    );
  }, [clients, q]);

  const onDelete = async (id) => {
    if (!window.confirm('Supprimer ce client ?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:4000/api/clients/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchClients();
    } catch (e) {
      console.error('Suppression échouée', e);
      alert('Erreur lors de la suppression');
    }
  };

  const openEdit = (client, e) => {
    e.stopPropagation();
    setClientToEdit(client);
    setShowModal(true);
  };

  const goClientCars = (id) => navigate(`/app/clients/${id}/voitures`);

  return (
    <div className="lc-wrap">
      {/* Barre top (retour + fil d’ariane) */}
      <div className="lc-topbar">
        
        <div className="lc-breadcrumb">
          <span className="crumb">Clients</span>
          <span className="sep">›</span>
          <span className="crumb active">Liste</span>
        </div>
      </div>

      {/* Header + recherche */}
      <div className="card lc-header">
        <div className="lc-header-row">
          <h1>
            Liste des clients
            <span className="badge-soft">{rows.length} résultat(s)</span>
          </h1>

          <Link to="/app/clients/ajouter" className="btn-primary">
            <i className="fas fa-plus"></i> Nouveau client
          </Link>
        </div>

        <div className="lc-search">
          <i className="fas fa-search"></i>
          <input
            className="lc-search-input"
            placeholder="Rechercher : nom, email, téléphone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {q && (
            <button className="lc-search-clear" onClick={() => setQ('')}>
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>
      </div>

      {/* Table pleine largeur (plus de carte Astuce) */}
      <div className="card lc-table-card">
        <div className="lc-table-head">
          <h3><i className="fas fa-users"></i> Clients</h3>
        </div>

        <div className="table-responsive">
          {rows.length === 0 ? (
            <div className="lc-empty">
              <i className="far fa-folder-open"></i>
              <div>Aucun client trouvé.</div>
            </div>
          ) : (
            <table className="pretty-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Prénom</th>
                  <th>Email</th>
                  <th>Téléphone</th>
                  <th>Adresse</th>
                  <th className="ta-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="clickable" onClick={() => goClientCars(c.id)}>
                    <td className="fw">{c.nom || '-'}</td>
                    <td>{c.prenom || '-'}</td>
                    <td>{c.email || '-'}</td>
                    <td>{c.telephone || '-'}</td>
                    <td>{[c.adresse, c.codePostal, c.ville].filter(Boolean).join(' ') || '-'}</td>
                    <td className="ta-right no-wrap" onClick={(e)=>e.stopPropagation()}>
                      <button className="ic-btn" title="Modifier" onClick={(e)=>openEdit(c, e)}>
                        <i className="fas fa-pen"></i>
                      </button>
                      <button className="ic-btn danger" title="Supprimer" onClick={() => onDelete(c.id)}>
                        <i className="fas fa-trash-alt"></i>
                      </button>
                      <button className="ic-btn ghost" title="Voir véhicules" onClick={() => goClientCars(c.id)}>
                        <i className="fas fa-car"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && clientToEdit && (
        <ModalModifierClient
          client={clientToEdit}
          onClose={() => setShowModal(false)}
          onUpdate={fetchClients}
        />
      )}
    </div>
  );
}
