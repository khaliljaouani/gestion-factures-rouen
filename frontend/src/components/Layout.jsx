// src/components/Layout.js
import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import './Sidebar.css';
import './App.css';

const Layout = ({ user }) => (
  <div className="app-frame">
    <Sidebar user={user} />
    <main className="main">
      <Outlet />
    </main>
  </div>
);

export default Layout;
