import React, { createContext, useContext, useState, useEffect } from 'react';
import { GET, onAuthExpired } from '../utils/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('av2_token') || null);
  const [loading, setLoading] = useState(true);
  const [institute, setInstitute] = useState(null);

  useEffect(() => {
    if (token) {
      GET('/auth/me')
        .then(async (u) => {
          setUser(u);
          if (u.role === 'institute_admin' || u.role === 'teacher') {
            try {
              const inst = await GET('/institutes/mine');
              setInstitute(inst);
            } catch { /* institute not yet created */ }
          }
          setLoading(false);
        })
        .catch(() => {
          logout();
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const unsub = onAuthExpired(() => logout());
    return unsub;
  }, []);

  const login = (newUser, newToken) => {
    localStorage.setItem('av2_token', newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('av2_token');
    setToken(null);
    setUser(null);
    setInstitute(null);
  };

  const updateUser = (updates) => {
    setUser(prev => prev ? { ...prev, ...updates } : null);
  };

  const updateInstitute = (inst) => {
    setInstitute(inst);
  };

  return (
    <AuthContext.Provider value={{
      user, token, loading, institute,
      login, logout, updateUser, updateInstitute, setInstitute
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
