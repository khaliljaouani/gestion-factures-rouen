import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <div className="page-section text-center">
      <h1>404 - Page non trouvée</h1>
      <p>Désolé, la page que vous recherchez n'existe pas.</p>
      <Link to="/factures" className="btn btn-primary">Retour à la liste des factures</Link>
    </div>
  );
};

export default NotFoundPage;
