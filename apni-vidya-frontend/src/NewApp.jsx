import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { AppRouter } from './AppRouter';
import { onToast } from './utils/api';
import './App.css'; // Add toast animations here if any

function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const unsub = onToast((t) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, 4000);
    });
    return unsub;
  }, []);

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type} animate-fade-in`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastContainer />
      <AppRouter />
    </AuthProvider>
  );
}
