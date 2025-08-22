import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import './ListeDevis.css';

// "envoyé" -> "envoye", "en attente" -> "en-attente"
const slug = (s = '') =>
  s.toString()
    .toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .trim();

const ListeDevis = () => {
  const navigate = useNavigate();

  const [devis, setDevis] = useState([]);
  const [loading, setLoading] = useState(true);

  // filtres
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return navigate('/login');
        const { data } = await axios.get('http://localhost:4000/api/devis', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setDevis(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Erreur chargement devis', err);
        if (err?.response?.status === 401) navigate('/login');
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  const fmtDate = (v) => (v ? new Date(v).toLocaleDateString('fr-FR') : '-');
  const fmtEuro = (n) =>
    (Number(n || 0)).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

  const filtered = useMemo(() => {
    let rows = [...devis];

    if (search) {
      const s = search.toLowerCase().trim();
      rows = rows.filter(d =>
        (d.numero || '').toLowerCase().includes(s) ||
        (d.client || '').toLowerCase().includes(s) ||
        (d.immatriculation || '').toLowerCase().includes(s) ||
        (d.created_by || '').toLowerCase().includes(s)
      );
    }

    if (status) {
      const want = slug(status);
      rows = rows.filter(d => slug(d.statut || '') === want);
    }

    const pickDate = (d) => d.date_devis || d.date || d.created_at || null;

    if (month) {
      const [y, m] = month.split('-');
      rows = rows.filter(d => {
        const dt = pickDate(d);
        if (!dt) return false;
        const dd = new Date(dt);
        return String(dd.getFullYear()) === y && String(dd.getMonth() + 1).padStart(2, '0') === m;
      });
    } else if (year) {
      rows = rows.filter(d => {
        const dt = pickDate(d);
        if (!dt) return false;
        return String(new Date(dt).getFullYear()) === String(year);
      });
    }

    return rows;
  }, [devis, search, status, month, year]);

  const resetFilters = () => { setSearch(''); setStatus(''); setMonth(''); setYear(''); };

  return (
    <div className="page-wrap">

      {/* Barre du haut (Nouveau devis) */}
      <div className="page-topbar">
        <Link to="/app/devis/nouvelle" className="btn btn-primary btn-new">
          <i className="fas fa-plus" /> Nouveau devis
        </Link>
      </div>

      {/* Carte Titre + Filtres */}
      <div className="card page-title-card">
        <div className="page-title-row">
          <h1 className="page-title">Liste des devis</h1>
        </div>

        <div className="filters-row">
          {/* Recherche */}
          <div className="search-input">
            <i className="fas fa-search" />
            <input
              type="text"
              placeholder="Rechercher : n°, client, immatriculation, admin…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Statut — (optionnel) si tu ajoutes un select */}
          {/* <select className="control" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Tous les statuts</option>
            <option>normal</option>
            <option>envoyé</option>
          </select> */}

          {/* Mois */}
          <input
            type="month"
            className="control"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            placeholder="Mois"
          />

          {/* Année */}
          <input
            type="number"
            min="2000"
            className="control"
            placeholder="Année"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          />

          {/* Réinitialiser */}
          <button className="btn btn-light" onClick={resetFilters}>
            Réinitialiser
          </button>
        </div>

        <div className="small text-muted" style={{ marginTop: 10 }}>
          {loading ? 'Chargement…' : `${filtered.length} résultat(s)`}
        </div>
      </div>

      {/* Tableau */}
      <div className="table-responsive">
        <table className="table table-hover align-middle invoice-table">
          <thead className="table-primary sticky-top">
            <tr>
              <th>Numéro</th>
              <th>Client</th>
              <th>Immatriculation</th>
              <th>Date</th>
              <th className="text-end">Total TTC</th>
              <th>Statut</th>
              <th>Réalisé·e par</th>
              <th className="text-center" style={{ width: 140 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" className="text-center py-4">Chargement…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="8" className="text-center py-4">Aucun devis trouvé.</td></tr>
            ) : (
              filtered.map((d) => {
                const dateVal = d.date_devis || d.date || d.created_at;
                const st = slug(d.statut || '');
                return (
                  <tr key={d.id}>
                    <td className="fw-600">{d.numero || '-'}</td>
                    <td>{d.client || '-'}</td>
                    <td>{d.immatriculation || '-'}</td>
                    <td>{fmtDate(dateVal)}</td>
                    <td className="text-end">{fmtEuro(d.montant_ttc)}</td>
                    <td>
                      <span className={`badge status-badge status-${st}`}>
                        {d.statut || '-'}
                      </span>
                    </td>
                    <td>
                      <span className="chip chip-admin" title={d.created_by || ''}>
                        {d.created_by || '-'}
                      </span>
                    </td>
                    <td className="text-center text-nowrap">
                      {/* ✅ ICI on utilise bien d.id (et chemin avec /app) */}
                      <Link
                        to={`/app/documents/devis/${d.id}/lignes`}
                        className="btn-ic"
                        title="Voir détails"
                      >
                        <i className="fas fa-eye" />
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ListeDevis;
