import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import 'bootstrap/dist/css/bootstrap.min.css';

const LoginPage = ({ setUser }) => {
  const [username, setUsername] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(`${API_URL}/api/auth/login`, {
        nom_utilisateur: username,
        mot_de_passe: motDePasse,
      });

      localStorage.setItem('token', data.token);
      setUser(data.user);
      navigate('/');
    } catch (err) {
      console.error('❌ Erreur de connexion :', err?.response?.data || err.message);
      toast.error("Identifiants incorrects ou serveur injoignable");
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
      <div className="card p-5 shadow" style={{ width: 420 }}>
        <h3 className="text-center mb-4">🔐 Connexion</h3>
        <form onSubmit={handleLogin}>
          <div className="form-group mb-3">
            <label htmlFor="username">Nom d'utilisateur</label>
            <input
              id="username"
              className="form-control"
              placeholder="ex: djamel_mechmache"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
           
          </div>

          <div className="form-group mb-4">
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary w-100 mb-3">
            ✅ Se connecter
          </button>

          <div className="text-center">
            <small>
              Pas encore de compte ?{' '}
              <Link to="/register">Inscrivez-vous</Link>
            </small>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
