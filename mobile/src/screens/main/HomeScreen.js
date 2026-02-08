import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { api } from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';
import { useOffline } from '../../contexts/OfflineContext';
import { colors, spacing, borderRadius, typography, shadows } from '../../config/theme';

export default function HomeScreen() {
  const { user } = useAuth();
  const { isOnline, pendingCount, savePendingRecord, syncPendingRecords, getNearestCachedWorksite } = useOffline();
  
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClocking, setIsClocking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [pulseAnim] = useState(new Animated.Value(1));

  // Actualizar reloj cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Animación de pulso para el botón
  useEffect(() => {
    if (status?.isClockedIn) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [status?.isClockedIn]);

  // Cargar estado inicial
  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setIsLoading(true);
      if (isOnline) {
        const response = await api.get('/clock/status');
        setStatus(response.data);
      }
    } catch (error) {
      console.error('Error obteniendo estado:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStatus();
    if (isOnline && pendingCount > 0) {
      await syncPendingRecords();
    }
    setRefreshing(false);
  }, [isOnline, pendingCount]);

  const handleClock = async (type) => {
    setIsClocking(true);
    
    try {
      // Solicitar permiso de ubicación
      const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
      if (permStatus !== 'granted') {
        Alert.alert(
          'Permiso requerido',
          'Necesitamos acceso a tu ubicación para verificar tu presencia en la obra.'
        );
        return;
      }

      // Obtener ubicación actual
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const clockData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        deviceInfo: `Expo ${Platform.OS}`,
      };

      if (isOnline) {
        // Fichar online
        const endpoint = type === 'in' ? '/clock/in' : '/clock/out';
        const response = await api.post(endpoint, clockData);
        
        Alert.alert(
          type === 'in' ? '✅ Entrada fichada' : '✅ Salida fichada',
          response.data.message,
          [{ text: 'OK' }]
        );
        
        if (response.data.warnings?.length > 0) {
          setTimeout(() => {
            Alert.alert('⚠️ Aviso', response.data.warnings.join('\n'));
          }, 500);
        }
      } else {
        // Fichar offline
        const nearestWorksite = getNearestCachedWorksite(
          location.coords.latitude,
          location.coords.longitude
        );
        
        await savePendingRecord({
          type: type === 'in' ? 'CLOCK_IN' : 'CLOCK_OUT',
          ...clockData,
          worksiteId: nearestWorksite?.id,
        });
        
        Alert.alert(
          '📱 Guardado offline',
          'El fichaje se ha guardado localmente y se sincronizará cuando tengas conexión.'
        );
      }
      
      await fetchStatus();
      
    } catch (error) {
      console.error('Error fichando:', error);
      const message = error.response?.data?.error || 'Error al fichar. Inténtalo de nuevo.';
      Alert.alert('Error', message);
    } finally {
      setIsClocking(false);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  const isClockedIn = status?.isClockedIn || false;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>
            Hola, {user?.firstName} 👷
          </Text>
          {!isOnline && (
            <View style={styles.offlineBadge}>
              <Ionicons name="cloud-offline" size={14} color={colors.warning} />
              <Text style={styles.offlineText}>Sin conexión</Text>
            </View>
          )}
        </View>

        {/* Reloj */}
        <View style={styles.clockContainer}>
          <Text style={styles.time}>{formatTime(currentTime)}</Text>
          <Text style={styles.date}>{formatDate(currentTime)}</Text>
        </View>

        {/* Estado actual */}
        <View style={[
          styles.statusCard,
          isClockedIn ? styles.statusCardActive : styles.statusCardInactive,
        ]}>
          <View style={styles.statusIndicator}>
            <View style={[
              styles.statusDot,
              isClockedIn ? styles.statusDotActive : styles.statusDotInactive,
            ]} />
            <Text style={styles.statusText}>
              {isLoading ? 'Cargando...' : isClockedIn ? 'EN JORNADA' : 'FUERA DE JORNADA'}
            </Text>
          </View>
          
          {isClockedIn && status?.currentSession && (
            <View style={styles.sessionInfo}>
              <Text style={styles.sessionLabel}>Entrada:</Text>
              <Text style={styles.sessionValue}>
                {new Date(status.currentSession.entryTime).toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
              <Text style={styles.sessionLabel}>Horas:</Text>
              <Text style={styles.sessionValue}>{status.currentSession.hoursWorked}h</Text>
            </View>
          )}
          
          {status?.currentSession?.worksite && (
            <View style={styles.worksiteInfo}>
              <Ionicons name="location" size={16} color={colors.textSecondary} />
              <Text style={styles.worksiteName}>{status.currentSession.worksite.name}</Text>
            </View>
          )}
        </View>

        {/* Botón de fichaje */}
        <Animated.View style={{ transform: [{ scale: isClockedIn ? pulseAnim : 1 }] }}>
          <TouchableOpacity
            style={[
              styles.clockButton,
              isClockedIn ? styles.clockOutButton : styles.clockInButton,
              isClocking && styles.clockButtonDisabled,
            ]}
            onPress={() => handleClock(isClockedIn ? 'out' : 'in')}
            disabled={isClocking || isLoading}
          >
            {isClocking ? (
              <ActivityIndicator size="large" color={colors.text} />
            ) : (
              <>
                <Ionicons 
                  name={isClockedIn ? 'exit-outline' : 'enter-outline'} 
                  size={48} 
                  color={colors.text} 
                />
                <Text style={styles.clockButtonText}>
                  {isClockedIn ? 'FICHAR SALIDA' : 'FICHAR ENTRADA'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Pendientes de sincronización */}
        {pendingCount > 0 && (
          <View style={styles.pendingCard}>
            <Ionicons name="sync" size={20} color={colors.warning} />
            <Text style={styles.pendingText}>
              {pendingCount} fichaje{pendingCount > 1 ? 's' : ''} pendiente{pendingCount > 1 ? 's' : ''} de sincronizar
            </Text>
            {isOnline && (
              <TouchableOpacity onPress={syncPendingRecords}>
                <Text style={styles.syncButton}>Sincronizar</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Info */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.infoText}>
            Tu ubicación se registrará únicamente al fichar para verificar tu presencia en la obra.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

import { Platform } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  greeting: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  offlineText: {
    fontSize: typography.fontSize.xs,
    color: colors.warning,
    fontWeight: '600',
  },
  clockContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  time: {
    fontSize: 56,
    fontWeight: '200',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  date: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  statusCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
  },
  statusCardActive: {
    backgroundColor: colors.success + '10',
    borderColor: colors.success + '30',
  },
  statusCardInactive: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusDotActive: {
    backgroundColor: colors.success,
  },
  statusDotInactive: {
    backgroundColor: colors.textMuted,
  },
  statusText: {
    fontSize: typography.fontSize.md,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 1,
  },
  sessionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  sessionLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  sessionValue: {
    fontSize: typography.fontSize.sm,
    color: colors.text,
    fontWeight: '600',
  },
  worksiteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  worksiteName: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  clockButton: {
    height: 160,
    borderRadius: borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    ...shadows.lg,
  },
  clockInButton: {
    backgroundColor: colors.clockIn,
  },
  clockOutButton: {
    backgroundColor: colors.clockOut,
  },
  clockButtonDisabled: {
    opacity: 0.7,
  },
  clockButtonText: {
    fontSize: typography.fontSize.xl,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing.sm,
    letterSpacing: 2,
  },
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '10',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  pendingText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.warning,
  },
  syncButton: {
    fontSize: typography.fontSize.sm,
    color: colors.accent,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
