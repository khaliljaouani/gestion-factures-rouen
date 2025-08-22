import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import './AjouteClient.css';

export default function AjoutClient() {
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

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

 const handleSubmit = async e => {
  e.preventDefault();
  const token = localStorage.getItem('token');

  if (!token) {
    toast.error("⚠️ Vous n'êtes pas connecté. Veuillez vous reconnecter.");
    return;
  }

  try {
    console.log("🔐 Envoi avec token :", token);
    await axios.post('http://localhost:4000/api/clients', form, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    toast.success('✅ Client ajouté avec succès !');
    setForm({
      civilite: '',
      nom: '',
      prenom: '',
      type: '',
      adresse: '',
      codePostal: '',
      ville: '',
      email: '',
      telephone: '',
    });
  } catch (err) {
    console.error('❌ Erreur lors de l\'ajout du client :', err);
    toast.error("❌ Erreur lors de l'ajout du client");
  }
};


  return (
    <div className="ajout-client-container">
      {/* Card du titre */}
      <div className="card-title">
        <h2>Ajouter un nouveau client</h2>
      </div>

      {/* Card du formulaire */}
      <div className="card-form">
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Civilité</label>
              <select name="civilite" value={form.civilite} onChange={handleChange} required>
                <option value="">Sélectionner</option>
                <option value="M.">M.</option>
                <option value="Mme">Mme</option>
                <option value="Mlle">Mlle</option>
              </select>
            </div>
            <div className="form-group">
              <label>Type</label>
              <select name="type" value={form.type} onChange={handleChange} required>
                <option value="">Sélectionner</option>
                <option value="particulier">Particulier</option>
                <option value="professionnel">Professionnel</option>
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
            <input type="text" name="adresse" value={form.adresse} onChange={handleChange} required />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Code postal</label>
              <input type="text" name="codePostal" value={form.codePostal} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Ville</label>
              <input type="text" name="ville" value={form.ville} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>E-mail</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Téléphone</label>
              <input type="tel" name="telephone" value={form.telephone} onChange={handleChange} required />
            </div>
          </div>

          <button type="submit" className="btn-save-full">Enregistrer</button>
        </form>
      </div>
    </div>
  );
}
