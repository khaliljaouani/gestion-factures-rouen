import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import './ModalNouveauClient.css';

export default function ModalNouveauClient({ onClose, onSave }) {
  const [form, setForm] = useState({
    civilite: '',
    nom: '',
    prenom: '',
    type: '',
    adresse: '',
    codePostal: '',
    ville: '',
    email: '',
    telephone: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem('token');
    if (!token) {
      alert("Token manquant. Veuillez vous reconnecter.");
      return;
    }

    try {
      const response = await axios.post('http://localhost:4000/api/clients', form, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const client = response.data;
      console.log("✅ Client créé :", client);

      // Vérifie que toutes les infos sont bien retournées
      if (!client.id || !client.nom || !client.prenom) {
        alert("⚠️ Le client retourné est incomplet.");
        return;
      }

      onSave && onSave(client); // transmet le client complet au parent
      onClose();
    } catch (err) {
      console.error("❌ Erreur lors de l'ajout du client :", err.response || err);
      alert("Erreur lors de l'ajout du client.");
    }
  };

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  return ReactDOM.createPortal(
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header">
          <h2>Nouveau client</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label>Civilité</label>
              <select name="civilite" value={form.civilite} onChange={handleChange} required>
                <option value="">Sélectionner</option>
                <option value="M.">M.</option>
                <option value="Mme">Mme</option>
              </select>
            </div>
            <div className="form-group">
              <label>Type</label>
              <select name="type" value={form.type} onChange={handleChange} required>
                <option value="">Sélectionner</option>
                <option value="Particulier">Particulier</option>
                <option value="Professionnel">Professionnel</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Nom</label>
              <input type="text" name="nom" value={form.nom} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Prénom</label>
              <input type="text" name="prenom" value={form.prenom} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-group">
            <label>Adresse</label>
            <input type="text" name="adresse" value={form.adresse} onChange={handleChange}  />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Code postal</label>
              <input type="text" name="codePostal" value={form.codePostal} onChange={handleChange}  />
            </div>
            <div className="form-group">
              <label>Ville</label>
              <input type="text" name="ville" value={form.ville} onChange={handleChange}  />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Email</label>
              <input type="email" name="email" value={form.email} onChange={handleChange}  />
            </div>
            <div className="form-group">
              <label>Téléphone</label>
              <input type="tel" name="telephone" value={form.telephone} onChange={handleChange}  />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-save">Enregistrer</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
