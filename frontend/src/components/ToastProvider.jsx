import React, { createContext, useCallback, useContext, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './toast.css';

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter(t => t.id !== id));
  }, []);

  const push = useCallback((type, message, opts = {}) => {
    const id = `${Date.now()}-${Math.random()}`;
    const ttl = opts.ttl ?? 3500;
    setToasts((prev) => [...prev, { id, type, message }]);
    if (ttl > 0) {
      setTimeout(() => remove(id), ttl);
    }
    return id;
  }, [remove]);

  const api = {
    success: (msg, opts) => push('success', msg, opts),
    error:   (msg, opts) => push('error', msg, opts),
    info:    (msg, opts) => push('info', msg, opts),
    remove,
  };

  return (
    <ToastCtx.Provider value={api}>
      {children}
      {createPortal(
        <div className="toast-container">
          {toasts.map(t => (
            <div key={t.id} className={`toast ${t.type}`}>
              {t.message}
              <button className="toast-close" onClick={() => remove(t.id)}>×</button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
