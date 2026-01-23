import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../config/api';

const OfflineContext = createContext(null);

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline debe usarse dentro de OfflineProvider');
  }
  return context;
};

const PENDING_RECORDS_KEY = '@soldeser_pending_records';
const WORKSITES_CACHE_KEY = '@soldeser_worksites_cache';

// Generar UUID simple sin dependencias
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const OfflineProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingRecords, setPendingRecords] = useState([]);
  const [cachedWorksites, setCachedWorksites] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Monitorear conectividad
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const wasOffline = !isOnline;
      const nowOnline = state.isConnected && state.isInternetReachable !== false;
      setIsOnline(nowOnline);
      
      // Si volvemos a estar online, intentar sincronizar
      if (wasOffline && nowOnline) {
        syncPendingRecords();
      }
    });

    loadCachedData();
    return () => unsubscribe();
  }, []);

  // Cargar datos cacheados
  const loadCachedData = async () => {
    try {
      const [records, worksites] = await Promise.all([
        AsyncStorage.getItem(PENDING_RECORDS_KEY),
        AsyncStorage.getItem(WORKSITES_CACHE_KEY),
      ]);
      
      if (records) setPendingRecords(JSON.parse(records));
      if (worksites) setCachedWorksites(JSON.parse(worksites));
    } catch (error) {
      console.error('Error cargando cache:', error);
    }
  };

  // Guardar fichaje pendiente (offline)
  const savePendingRecord = async (record) => {
    const newRecord = {
      ...record,
      deviceRecordId: generateUUID(),
      timestamp: new Date().toISOString(),
      syncStatus: 'PENDING',
    };

    const updated = [...pendingRecords, newRecord];
    setPendingRecords(updated);
    await AsyncStorage.setItem(PENDING_RECORDS_KEY, JSON.stringify(updated));
    
    return newRecord;
  };

  // Sincronizar fichajes pendientes
  const syncPendingRecords = useCallback(async () => {
    if (!isOnline || pendingRecords.length === 0 || isSyncing) {
      return { synced: 0, failed: 0 };
    }

    setIsSyncing(true);
    
    try {
      const response = await api.post('/sync/clock-records', {
        records: pendingRecords,
      });

      const { results } = response.data;
      
      // Eliminar registros sincronizados exitosamente
      const syncedIds = [
        ...results.synced.map(r => r.deviceRecordId),
        ...results.duplicates.map(r => r.deviceRecordId),
      ];
      
      const remaining = pendingRecords.filter(
        r => !syncedIds.includes(r.deviceRecordId)
      );
      
      setPendingRecords(remaining);
      await AsyncStorage.setItem(PENDING_RECORDS_KEY, JSON.stringify(remaining));

      return {
        synced: results.synced.length,
        duplicates: results.duplicates.length,
        failed: results.errors.length,
      };
    } catch (error) {
      console.error('Error sincronizando:', error);
      return { synced: 0, failed: pendingRecords.length };
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, pendingRecords, isSyncing]);

  // Actualizar cache de obras
  const refreshWorksitesCache = async () => {
    if (!isOnline) return false;
    
    try {
      const response = await api.get('/sync/worksites');
      const { worksites } = response.data;
      
      setCachedWorksites(worksites);
      await AsyncStorage.setItem(WORKSITES_CACHE_KEY, JSON.stringify(worksites));
      
      return true;
    } catch (error) {
      console.error('Error actualizando cache de obras:', error);
      return false;
    }
  };

  // Obtener obra más cercana del cache
  const getNearestCachedWorksite = (latitude, longitude) => {
    if (cachedWorksites.length === 0) return null;
    
    let nearest = null;
    let minDistance = Infinity;
    
    for (const ws of cachedWorksites) {
      const distance = calculateDistance(latitude, longitude, ws.latitude, ws.longitude);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = { ...ws, distance: Math.round(distance) };
      }
    }
    
    return nearest;
  };

  // Fórmula de Haversine
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const value = {
    isOnline,
    pendingRecords,
    pendingCount: pendingRecords.length,
    cachedWorksites,
    isSyncing,
    savePendingRecord,
    syncPendingRecords,
    refreshWorksitesCache,
    getNearestCachedWorksite,
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
};
