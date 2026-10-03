import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

const STORAGE_KEY = 'proctor_auth';
const TOKEN_KEY = 'proctor_token';

const readStoredUser = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    return readStoredUser();
  });
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '');
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  useEffect(() => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }, [token]);

  const login = ({ userData, authToken, skipNavigation = false }) => {
    // Write synchronously so a refresh immediately after navigation cannot
    // race the React persistence effect.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    localStorage.setItem(TOKEN_KEY, authToken);
    setUser(userData);
    setToken(authToken);

    if (skipNavigation) return;

    if (userData.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/student');
    }
  };

  const updateUser = (userData) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setToken('');
    navigate('/');
  };

  const value = useMemo(
    () => ({ user, token, login, updateUser, logout }),
    [user, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
