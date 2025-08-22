import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';

export default function DevisVoiture() {
  const { id } = useParams();
  const [devis, setDevis] = useState([]);

  useEffect(() => {
    axios.get(`http://localhost:4000/api/voitures/${id}/devis`)
      .then(res => setDevis(res.data))
      .catch(err => console.error("Erreur lors du chargement des devis :", err));
  }, [id]);

  return (
    <div className="page-section">
      <h2>Devis de la voiture</h2>
      {devis.length === 0 ? (
        <p>Aucun devis trouvé pour cette voiture.</p>
      ) : (
        <ul>
          {devis.map(d => (
            <li key={d.id}>
              <strong>{d.numero}</strong> – {d.date_devis}
              <Link to={`/devis/${d.id}/lignes`} style={{ marginLeft: '10px' }}>
                Voir détails
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
