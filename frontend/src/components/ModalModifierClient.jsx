import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './ModalModifierClient.css';

export default function ModalModifierClient({ client, onClose, onUpdate }) {
  const [form, setForm] = useState({});

  useEffect(() => {
    setForm({
      civilite: client.civilite || '',
      nom: client.nom || '',
      prenom: client.prenom || '',
      type: client.type || '',
      adresse: client.adresse || '',
      codePostal: client.codePostal || '',
      ville: client.ville || '',
      email: client.email || '',
      telephone: client.telephone || ''
    });
  }, [client]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  const token = localStorage.getItem("token"); // récupère le token

  try {
    await axios.put(
      `http://localhost:4000/api/clients/${client.id || client._id}`,
      form,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    onUpdate();
    onClose();
  } catch (err) {
    console.error("❌ Erreur lors de la mise à jour :", err.response);
    alert("Erreur lors de la mise à jour du client.");
  }
};


  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Modifier client</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form className="modal-body" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Civilité</label>
              <select name="civilite" value={form.civilite} onChange={handleChange}>
                <option value="">Sélectionner</option>
                <option value="M.">M.</option>
                <option value="Mme">Mme</option>
                <option value="Mlle">Mlle</option>
              </select>
            </div>
            <div className="form-group">
              <label>Type</label>
              <select name="type" value={form.type} onChange={handleChange}>
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
              <label>Code Postal</label>
              <input type="text" name="codePostal" value={form.codePostal} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Ville</label>
              <input type="text" name="ville" value={form.ville} onChange={handleChange} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Email</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Téléphone</label>
              <input type="tel" name="telephone" value={form.telephone} onChange={handleChange} />
            </div>
          </div>

          <div style={{ textAlign: 'right', marginTop: 20 }}>
            <button type="submit" className="btn-save">💾 Enregistrer</button>
          </div>
        </form>
      </div>
    </div>
  );
}
