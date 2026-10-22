import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authAPI, pushTokensAPI } from '../api';
import { getPushToken, setPushToken } from '../utils/pushToken';
import { clearSession, errorMessage, loadSession, saveSession, saveUser, setUnauthorizedHandler } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    const pushToken = getPushToken();
    if (pushToken) {
      setPushToken(null);
      await pushTokensAPI.unregister(pushToken).catch(() => {});
    }
    await clearSession();
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
    });
    loadSession()
      .then((session) => {
        if (session) setUser(session.user);
      })
      .finally(() => setLoading(false));
  }, [logout]);

  const login = async (loginName, password) => {
    try {
      const res = await authAPI.login({ loginName, password });
      const { token, user: userData } = res.data;
      await saveSession(token, userData);
      setUser(userData);
      return { success: true };
    } catch (err) {
      return { success: false, error: errorMessage(err) };
    }
  };

  const updateUser = (updated) => {
    setUser(updated);
    saveUser(updated).catch(() => {});
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, updateUser, isAdmin: user?.userType === 'admin', isAuthenticated: !!user }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
