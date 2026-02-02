import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api } from '../config/api';
import { supabase, isSupabaseConfigured } from '../config/supabase';

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
      // 1. Si Supabase está configurado, verificar sesión de Supabase primero
      if (isSupabaseConfigured() && supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          await SecureStore.setItemAsync('authToken', session.access_token);
          const userData = await SecureStore.getItemAsync('userData');
          if (userData) {
            setUser(JSON.parse(userData));
          }
          // Validar token con backend (si falla por red, mantener sesión cacheada)
          try {
            const response = await api.get('/auth/me');
            setUser(response.data.user);
            await SecureStore.setItemAsync('userData', JSON.stringify(response.data.user));
          } catch (err) {
            if (err.response?.status === 401) {
              await supabase.auth.signOut();
              await logout();
            }
            // Si es error de red (Network request failed), mantener userData cacheado
          }
          setIsLoading(false);
          return;
        }
      }

      // 2. Fallback: token propio del backend (login PIN o sin Supabase)
      const token = await SecureStore.getItemAsync('authToken');
      const userData = await SecureStore.getItemAsync('userData');

      if (token && userData) {
        setUser(JSON.parse(userData));

        try {
          const response = await api.get('/auth/me');
          setUser(response.data.user);
          await SecureStore.setItemAsync('userData', JSON.stringify(response.data.user));
        } catch (err) {
          if (err.response?.status === 401) {
            await logout();
          }
          // Si es error de red, mantener sesión cacheada para uso offline
        }
      }
    } catch (err) {
      console.error('Error verificando auth:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getErrorMessage = (err) => {
    if (!err) return 'Error al iniciar sesión';
    if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      return 'El servidor tarda en responder. Intenta de nuevo (puede estar iniciando).';
    }
    if (err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
      return 'Sin conexión. Verifica tu internet y que el servidor esté activo.';
    }
    if (err.response?.status === 404) {
      return 'API no encontrada (404). Verifica la URL del backend en Railway.';
    }
    if (err.response?.data?.error) {
      const msg = err.response.data.error;
      if (msg.includes('Token') || msg.includes('token') || err.response.data.code === 'INVALID_TOKEN') {
        return 'Sesión expirada. Inicia sesión de nuevo.';
      }
      return msg;
    }
    if (err.response?.status === 401) return 'Credenciales inválidas';
    if (err.response?.status === 403) return 'Cuenta desactivada';
    if (err.response?.status >= 500) return 'Error del servidor. Intenta más tarde.';
    return err.message || 'Error al iniciar sesión';
  };

  const login = async (email, password) => {
    try {
      setError(null);
      setIsLoading(true);

      // Usar Supabase Auth si está configurado
      if (isSupabaseConfigured() && supabase) {
        const { data, error: supabaseError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (supabaseError) {
          const message =
            supabaseError.message === 'Invalid login credentials'
              ? 'Credenciales inválidas'
              : supabaseError.message;
          setError(message);
          return { success: false, error: message };
        }

        if (data.session?.access_token) {
          await SecureStore.setItemAsync('authToken', data.session.access_token);
          try {
            const response = await api.get('/auth/me');
            const userData = response.data.user;
            setUser(userData);
            await SecureStore.setItemAsync('userData', JSON.stringify(userData));
            return { success: true };
          } catch (meError) {
            const msg = getErrorMessage(meError);
            setError(msg);
            await supabase.auth.signOut();
            await SecureStore.deleteItemAsync('authToken');
            return { success: false, error: msg };
          }
        }
      }

      // Login vía backend (cuando Supabase no está configurado)
      const response = await api.post('/auth/login', { email, password });
      const { token, user: userData } = response.data;

      await SecureStore.setItemAsync('authToken', token);
      await SecureStore.setItemAsync('userData', JSON.stringify(userData));

      setUser(userData);
      return { success: true };
    } catch (err) {
      const message = getErrorMessage(err);
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
      const message = getErrorMessage(err) || 'DNI o PIN incorrecto';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (isSupabaseConfigured() && supabase) {
        await supabase.auth.signOut();
      }
      await api.post('/auth/logout');
    } catch (err) {
      // Ignorar error de logout
    } finally {
      await SecureStore.deleteItemAsync('authToken');
      await SecureStore.deleteItemAsync('userData');
      setUser(null);
      setError(null);
    }
  };

  const updateConsent = async (gdprConsent, locationConsent) => {
    try {
      const response = await api.post('/auth/consent', {
        gdprConsent,
        locationConsent,
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
