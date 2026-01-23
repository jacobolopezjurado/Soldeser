import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// URLs desde variables de entorno (app.config.js)
const API_URL_DEV = Constants.expoConfig?.extra?.apiUrlDev || 'http://localhost:3001/api';
// URL de producción en Render
const API_URL = 'https://soldeser.onrender.com/api';

console.log('🔗 API URL:', API_URL); // Para debug

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para añadir token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error obteniendo token:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si el token expiró
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Limpiar token y redirigir a login
      await SecureStore.deleteItemAsync('authToken');
    }

    return Promise.reject(error);
  }
);

export { api, API_URL };
