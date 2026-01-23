import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api } from '../config/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Verificar sesión al iniciar
  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      const userData = await SecureStore.getItemAsync('userData');
      
      if (token && userData) {
        setUser(JSON.parse(userData));
        
        // Verificar que el token sigue siendo válido
        try {
          const response = await api.get('/auth/me');
          setUser(response.data.user);
          await SecureStore.setItemAsync('userData', JSON.stringify(response.data.user));
        } catch (err) {
          // Token inválido, limpiar sesión
          if (err.response?.status === 401) {
            await logout();
          }
        }
      }
    } catch (err) {
      console.error('Error verificando auth:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);
      setIsLoading(true);
      
      const response = await api.post('/auth/login', { email, password });
      const { token, user: userData } = response.data;
      
      await SecureStore.setItemAsync('authToken', token);
      await SecureStore.setItemAsync('userData', JSON.stringify(userData));
      
      setUser(userData);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.error || 'Error al iniciar sesión';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithPin = async (dni, pin) => {
    try {
      setError(null);
      setIsLoading(true);
      
      const response = await api.post('/auth/login-pin', { dni, pin });
      const { token, user: userData } = response.data;
      
      await SecureStore.setItemAsync('authToken', token);
      await SecureStore.setItemAsync('userData', JSON.stringify(userData));
      
      setUser(userData);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.error || 'DNI o PIN incorrecto';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      // Ignorar error de logout
    } finally {
      await SecureStore.deleteItemAsync('authToken');
      await SecureStore.deleteItemAsync('userData');
      setUser(null);
    }
  };

  const updateConsent = async (gdprConsent, locationConsent) => {
    try {
      const response = await api.post('/auth/consent', { 
        gdprConsent, 
        locationConsent 
      });
      
      const updatedUser = { ...user, ...response.data.user };
      setUser(updatedUser);
      await SecureStore.setItemAsync('userData', JSON.stringify(updatedUser));
      
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error };
    }
  };

  const value = {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
    login,
    loginWithPin,
    logout,
    updateConsent,
    refreshUser: checkAuthState,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
