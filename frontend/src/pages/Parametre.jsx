import React, { useEffect, useState } from 'react';
import axios from 'axios';

const Parametre = () => {
  const [parametres, setParametres] = useState({
    numeroFacture: '',
    numeroFactureCachee: '',
    numeroDevis: ''
  });

  // Charger les paramètres existants
  useEffect(() => {
    axios.get('/api/parametres')
      .then(res => {
        setParametres({
          numeroFacture: res.data.numero_facture || '',
          numeroFactureCachee: res.data.numero_facture_cachee || '',
          numeroDevis: res.data.numero_devis || ''
        });
      })
      .catch(err => console.error(err));
  }, []);

  const handleChange = (e) => {
    setParametres({ ...parametres, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    axios.put('/api/parametres', {
      numeroFacture: parametres.numeroFacture,
      numeroFactureCachee: parametres.numeroFactureCachee,
      numeroDevis: parametres.numeroDevis
    })
    .then(() => alert("Paramètres mis à jour !"))
    .catch(err => console.error(err));
  };

  return (
    <div className="container mt-4">
      <h2>Paramètres de numérotation</h2>

      <div className="form-group">
        <label>Numéro de facture</label>
        <input
          type="text"
          className="form-control"
          name="numeroFacture"
          value={parametres.numeroFacture}
          onChange={handleChange}
        />
      </div>

      <div className="form-group">
        <label>Numéro de facture cachée</label>
        <input
          type="text"
          className="form-control"
          name="numeroFactureCachee"
          value={parametres.numeroFactureCachee}
          onChange={handleChange}
        />
      </div>

      <div className="form-group">
        <label>Numéro de devis</label>
        <input
          type="text"
          className="form-control"
          name="numeroDevis"
          value={parametres.numeroDevis}
          onChange={handleChange}
        />
      </div>

      <button className="btn btn-primary mt-3" onClick={handleSave}>Enregistrer</button>
    </div>
  );
};

export default Parametre;
