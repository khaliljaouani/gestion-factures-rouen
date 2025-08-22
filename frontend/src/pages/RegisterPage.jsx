import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';

const RegisterPage = () => {
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [confirm, setConfirm] = useState('');
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

  const makeUsername = (p, n) => {
    const norm = (s) =>
      s
        .toString()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '_')
        .toLowerCase();
    return `${norm(p)}_${norm(n)}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (motDePasse !== confirm) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    try {
      const { data } = await axios.post(`${API_URL}/api/auth/register`, {
        prenom, nom, mot_de_passe: motDePasse,
      });
      toast.success(
        `Compte créé : ${data.user.nom_utilisateur}. Vous pouvez vous connecter.`
      );
      navigate('/login');
    } catch (err) {
      console.error('❌ Erreur inscription :', err?.response?.data || err.message);
      toast.error(err?.response?.data?.error || 'Erreur lors de la création du compte');
    }
  };

  const usernamePreview = makeUsername(prenom, nom);

  return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
      <div className="card p-5 shadow" style={{ width: 480 }}>
        <h3 className="text-center mb-4">📝 Inscription</h3>
        <form onSubmit={handleSubmit}>
          <div className="row">
            <div className="col-md-6 mb-3">
              <label>Prénom</label>
              <input
                className="form-control"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                required
              />
            </div>
            <div className="col-md-6 mb-3">
              <label>Nom</label>
              <input
                className="form-control"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="mb-2">
            <small className="text-muted">
              Le nom d’utilisateur sera : <strong>{usernamePreview || 'prenom_nom'}</strong>
            </small>
          </div>

          <div className="mb-3">
            <label>Mot de passe</label>
            <input
              type="password"
              className="form-control"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              required
            />
          </div>

          <div className="mb-4">
            <label>Confirmer le mot de passe</label>
            <input
              type="password"
              className="form-control"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>

          <button className="btn btn-success w-100 mb-3">Créer le compte</button>

          <div className="text-center">
            <small>
              Déjà un compte ? <Link to="/login">Se connecter</Link>
            </small>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;
