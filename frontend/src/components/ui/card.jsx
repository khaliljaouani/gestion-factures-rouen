// 📄 src/components/ui/card.jsx

import React from 'react';
import './card.css'; // Tu peux aussi styliser ici

export function Card({ children, className = '' }) {
  return (
    <div className={`rounded-xl shadow-md bg-white p-4 ${className}`}>
      {children}
    </div>
  );
}

export function CardContent({ children, className = '' }) {
  return (
    <div className={`card-content ${className}`}>
      {children}
    </div>
  );
}
