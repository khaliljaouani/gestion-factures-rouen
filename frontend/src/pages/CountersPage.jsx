import React, { useEffect, useState } from 'react';
import axios from 'axios';

// Nettoie l'affichage des "prochains" renvoyés par le backend (retire les zéros inutiles)
const stripNext = (val) => {
  if (val == null || val === '') return '---';
  const s = String(val);
  if (/^C/i.test(s)) {
    const num = s.replace(/^C/i, '').replace(/^0+/, '');
    return 'C' + (num === '' ? '0' : num);
  }
  const n = s.replace(/^0+/, '');
  return n === '' ? '0' : n;
};

const CountersPage = () => {
  const [form, setForm] = useState({ normal: 0, cachee: 0, devis: 0 });
  const [next, setNext] = useState({ nextNormal: '', nextCachee: '', nextDevis: '' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const loadAll = async () => {
    setErr(''); setMsg('');
    try {
      const token = localStorage.getItem('token');
      const [counters, nexts] = await Promise.all([
        axios.get('http://localhost:4000/api/counters', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:4000/api/counters/next', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setForm({
        normal: counters.data.normal ?? 0,
        cachee: counters.data.cachee ?? 0,
        devis:  counters.data.devis  ?? 0,
      });
      setNext(nexts.data);
    } catch (e) {
      setErr("Impossible de charger les compteurs.");
    }
  };

  useEffect(() => { loadAll(); }, []);

  const save = async () => {
    setMsg(''); setErr('');
    const n = Number(form.normal), c = Number(form.cachee), d = Number(form.devis);
    if (!Number.isInteger(n) || n < 0) return setErr("Le compteur 'normal' doit être un entier ≥ 0.");
    if (!Number.isInteger(c) || c < 0) return setErr("Le compteur 'cachée' doit être un entier ≥ 0.");
    if (!Number.isInteger(d) || d < 0) return setErr("Le compteur 'devis' doit être un entier ≥ 0.");
    try {
      const token = localStorage.getItem('token');
      await axios.put('http://localhost:4000/api/counters',
        { normal: n, cachee: c, devis: d },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMsg('Compteurs mis à jour ✔');
      loadAll();
    } catch (e) {
      setErr('Erreur lors de la mise à jour.');
    }
  };

  // Prochains affichés côté UI (sans zéros)
  const nextNormalUI = Number(form.normal || 0) + 1;        // 1,2,3…
  const nextCacheeUI = 'C' + (Number(form.cachee || 0) + 1); // C1,C2,C3…
  const nextDevisUI  = Number(form.devis  || 0) + 1;        // 1,2,3…

  return (
    <div className="container py-3">
      <h3>Gestion des compteurs</h3>
      <p className="text-muted">
        Ces valeurs sont les <strong>derniers numéros utilisés</strong>. Le prochain = dernier + 1.
      </p>

      <div className="card p-3 mb-3">
        <label className="form-label">Dernier numéro Facture (Normal)</label>
        <input
          type="number" min="0" className="form-control"
          value={form.normal}
          onChange={e=>setForm(prev=>({...prev, normal:e.target.value}))}
        />
        <small className="text-muted">Prochain : <code>{nextNormalUI}</code></small>
      </div>

      <div className="card p-3 mb-3">
        <label className="form-label">Dernier numéro Facture (Cachée)</label>
        <input
          type="number" min="0" className="form-control"
          value={form.cachee}
          onChange={e=>setForm(prev=>({...prev, cachee:e.target.value}))}
        />
        <small className="text-muted">Prochain : <code>{nextCacheeUI}</code></small>
      </div>

      <div className="card p-3 mb-3">
        <label className="form-label">Dernier numéro Devis</label>
        <input
          type="number" min="0" className="form-control"
          value={form.devis}
          onChange={e=>setForm(prev=>({...prev, devis:e.target.value}))}
        />
        <small className="text-muted">Prochain : <code>{nextDevisUI}</code></small>
      </div>

      {err && <div className="alert alert-danger">{err}</div>}
      {msg && <div className="alert alert-success">{msg}</div>}

      <div className="d-flex justify-content-end" style={{gap:8}}>
        <a className="btn btn-light" href="/factures/nouvelle">Retour</a>
        <button className="btn btn-primary" onClick={save}>Enregistrer</button>
      </div>

      <hr />
      <div>
        <strong>Prochains numéros (backend) :</strong>&nbsp;
        <code>{stripNext(next.nextNormal)}</code> &nbsp;|&nbsp;
        <code>{stripNext(next.nextCachee)}</code> &nbsp;|&nbsp;
        <code>{stripNext(next.nextDevis)}</code>
      </div>
    </div>
  );
};

export default CountersPage;
