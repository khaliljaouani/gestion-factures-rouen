// src/main.jsx
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';

// Styles
import '@fortawesome/fontawesome-free/css/all.min.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Pages
import RegisterPage from './pages/RegisterPage';

import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import InvoiceListPage from './pages/InvoiceListPage';
import CreateInvoicePage from './pages/CreateInvoicePage';
import CreateDevisPage from './pages/CreateDevisPage';
import FacturePreviewPage from './pages/FacturePreviewPage';
import ListeFactures from './pages/ListeFactures';
import ListeDevis from './pages/ListeDevis';
import AjoutClient from './pages/AjoutClient';
import ClientList from './pages/ClientList';
import VoituresClient from './pages/VoituresClient';
import DocumentsVoiture from './pages/DocumentsVoiture';
import ViewDevisPage from './pages/DevisPreviewPage';
import LignesDocument from './pages/LignesDocument';
import CountersPage from './pages/CountersPage';

// Composants
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';

const App = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !user) setUser({ token });
  }, [user]);

  const isAuth = !!localStorage.getItem('token');

  return (
    <HashRouter basename="/">
      <ToastContainer position="top-center" autoClose={3000} />
      <Routes>
        {/* Publique */}
        <Route path="/login" element={<LoginPage setUser={setUser} />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Redirection racine */}
       <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Zone privée */}
        <Route
          path="/app"
          element={
            <PrivateRoute user={user}>
              <Layout user={user} />
            </PrivateRoute>
          }
        >
          <Route index element={<Dashboard />} />

          {/* Factures */}
          <Route path="factures/nouvelle" element={<CreateInvoicePage />} />
          <Route path="factures/preview" element={<FacturePreviewPage />} />
          <Route path="factures/liste" element={<ListeFactures />} />

          {/* Devis */}
          <Route path="devis/nouvelle" element={<CreateDevisPage />} />
          <Route path="devis/preview" element={<ViewDevisPage />} />
          <Route path="devis/liste" element={<ListeDevis />} />

          {/* Clients / Voitures */}
          <Route path="clients/liste" element={<ClientList />} />
          <Route path="clients/ajouter" element={<AjoutClient />} />
          <Route path="clients/:id/voitures" element={<VoituresClient />} />
          <Route path="voitures/:id/documents" element={<DocumentsVoiture />} />

          {/* Lignes */}
          <Route path="documents/:type/:id/lignes" element={<LignesDocument />} />

          {/* Paramètres */}
          <Route path="parametres/compteurs" element={<CountersPage />} />
        </Route>

        {/* Catch-all */}
        <Route
          path="*"
          element={<Navigate to={isAuth ? '/app' : '/login'} replace />}
        />
      </Routes>
    </HashRouter>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
