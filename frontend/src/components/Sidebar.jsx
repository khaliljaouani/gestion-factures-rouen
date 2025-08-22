// src/components/Sidebar.js
import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = ({ user }) => {
  const [openMenu, setOpenMenu] = useState('');
  const navigate = useNavigate();

  const handleToggle = (menu) => setOpenMenu(openMenu === menu ? '' : menu);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
    window.location.reload();
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">ROUEN PNEU</div>
      </div>

      <nav className="nav-section">
        {/* Dashboard */}
        <NavLink className="nav-item" to="/app" end>
          <div className="nav-icon-label">
            <i className="fas fa-tachometer-alt" />
            <span>Tableau de bord</span>
          </div>
        </NavLink>

        {/* Factures */}
        <div className="nav-category" onClick={() => handleToggle('factures')}>
          <span><i className="fas fa-file-invoice" /> Factures</span>
          <i className={`fas ${openMenu === 'factures' ? 'fa-chevron-down' : 'fa-chevron-right'}`} />
        </div>
        {openMenu === 'factures' && (
          <div className="submenu">
            <NavLink className="submenu-item" to="/app/factures/nouvelle">Nouvelle facture</NavLink>
            <NavLink className="submenu-item" to="/app/factures/liste">Liste des factures</NavLink>
          </div>
        )}

        {/* Devis */}
        <div className="nav-category" onClick={() => handleToggle('devis')}>
          <span><i className="fas fa-file-alt" /> Devis</span>
          <i className={`fas ${openMenu === 'devis' ? 'fa-chevron-down' : 'fa-chevron-right'}`} />
        </div>
        {openMenu === 'devis' && (
          <div className="submenu">
            <NavLink className="submenu-item" to="/app/devis/nouvelle">Nouveau devis</NavLink>
            <NavLink className="submenu-item" to="/app/devis/liste">Afficher les devis</NavLink>
          </div>
        )}

        {/* Clients */}
        <div className="nav-category" onClick={() => handleToggle('clients')}>
          <span><i className="fas fa-users" /> Clients</span>
          <i className={`fas ${openMenu === 'clients' ? 'fa-chevron-down' : 'fa-chevron-right'}`} />
        </div>
        {openMenu === 'clients' && (
          <div className="submenu">
            <NavLink className="submenu-item" to="/app/clients/ajouter">Ajouter client</NavLink>
            <NavLink className="submenu-item" to="/app/clients/liste">Liste des clients</NavLink>
          </div>
        )}

        

        {/* Paramètres */}
        <div className="nav-category" onClick={() => handleToggle('parametres')}>
          <span><i className="fas fa-cog" /> Paramètres</span>
          <i className={`fas ${openMenu === 'parametres' ? 'fa-chevron-down' : 'fa-chevron-right'}`} />
        </div>
        {openMenu === 'parametres' && (
          <div className="submenu">
            <NavLink className="submenu-item" to="/app/parametres/compteurs">Compteurs</NavLink>
          </div>
        )}
      </nav>

      {user && (
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-name">{user.prenom} {user.nom}</div>
            <div className="user-role">Administrateur</div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt" /> Déconnexion
          </button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
