import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { api } from '../../config/api';
import { colors, spacing, borderRadius, typography } from '../../config/theme';

import { useNavigation } from '@react-navigation/native';

export default function AdminDashboard() {
  const navigation = useNavigation();
  const [dashboard, setDashboard] = useState(null);
  const [activeWorkers, setActiveWorkers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [dashRes, workersRes] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/admin/active-workers'),
      ]);
      setDashboard(dashRes.data);
      setActiveWorkers(workersRes.data.workers);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, []);

  const [isExporting, setIsExporting] = useState(false);

  const handleExportCSV = async (type) => {
    try {
      setIsExporting(true);
      
      const today = new Date();
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      const endpoint = type === 'records' 
        ? '/export/clock-records/csv'
        : '/export/hours-summary/csv';

      const response = await api.get(endpoint, {
        params: {
          startDate: monthAgo.toISOString(),
          endDate: today.toISOString(),
        },
        responseType: 'text',
      });

      // Guardar archivo temporalmente
      const filename = type === 'records' 
        ? `fichajes_${today.toISOString().split('T')[0]}.csv`
        : `resumen_horas_${today.toISOString().split('T')[0]}.csv`;
      
      const fileUri = FileSystem.documentDirectory + filename;
      await FileSystem.writeAsStringAsync(fileUri, response.data);

      // Compartir archivo
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Exportar fichajes',
          UTI: 'public.comma-separated-values-text',
        });
      } else {
        Alert.alert('Éxito', `Archivo guardado en: ${fileUri}`);
      }

    } catch (error) {
      console.error('Error exportando:', error);
      Alert.alert('Error', 'No se pudo exportar. Verifica tu conexión.');
    } finally {
      setIsExporting(false);
    }
  };

  const StatCard = ({ icon, label, value, color = colors.accent }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Panel de Control</Text>
          <Text style={styles.subtitle}>Administrador</Text>
        </View>

        {/* Estadísticas */}
        <View style={styles.statsGrid}>
          <StatCard 
            icon="people" 
            label="Trabajadores" 
            value={dashboard?.stats?.totalWorkers || 0} 
          />
          <StatCard 
            icon="radio-button-on" 
            label="Activos ahora" 
            value={dashboard?.stats?.activeNow || 0}
            color={colors.success}
          />
          <StatCard 
            icon="business" 
            label="Obras" 
            value={dashboard?.stats?.totalWorksites || 0}
            color={colors.info}
          />
          <StatCard 
            icon="time" 
            label="Fichajes hoy" 
            value={dashboard?.stats?.todayClocks || 0}
            color={colors.warning}
          />
        </View>

        {/* Accesos rápidos */}
        <TouchableOpacity 
          style={styles.quickAction}
          onPress={() => navigation.navigate('PayslipsAdmin')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: colors.accent + '20' }]}>
            <Ionicons name="document-text" size={24} color={colors.accent} />
          </View>
          <View style={styles.quickActionInfo}>
            <Text style={styles.quickActionTitle}>Nóminas subidas</Text>
            <Text style={styles.quickActionDesc}>Ver fotos de nóminas de trabajadores</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.quickAction}
          onPress={() => navigation.navigate('UsersManagement')}
        >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.accent + '20' }]}>
            <Ionicons name="people" size={24} color={colors.accent} />
          </View>
          <View style={styles.quickActionInfo}>
            <Text style={styles.quickActionTitle}>Gestionar Usuarios</Text>
            <Text style={styles.quickActionDesc}>Añadir, editar y desactivar trabajadores</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Alertas */}
        {dashboard?.stats?.outsideGeofenceToday > 0 && (
          <View style={styles.alertCard}>
            <Ionicons name="warning" size={20} color={colors.warning} />
            <Text style={styles.alertText}>
              {dashboard.stats.outsideGeofenceToday} fichaje(s) fuera de zona hoy
            </Text>
          </View>
        )}

        {/* Trabajadores activos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            👷 Trabajadores en jornada ({activeWorkers.length})
          </Text>
          
          {activeWorkers.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No hay trabajadores fichados ahora</Text>
            </View>
          ) : (
            activeWorkers.map((worker) => (
              <View key={worker.user.id} style={styles.workerCard}>
                <View style={styles.workerInfo}>
                  <View style={styles.workerAvatar}>
                    <Text style={styles.workerInitials}>
                      {worker.user.firstName[0]}{worker.user.lastName[0]}
                    </Text>
                  </View>
                  <View style={styles.workerDetails}>
                    <Text style={styles.workerName}>
                      {worker.user.firstName} {worker.user.lastName}
                    </Text>
                    <Text style={styles.workerMeta}>
                      {worker.worksite?.name || 'Sin obra'} • {worker.hoursWorked}h
                    </Text>
                  </View>
                </View>
                <View style={styles.workerStatus}>
                  {worker.isWithinGeofence === false ? (
                    <View style={styles.warningBadge}>
                      <Ionicons name="warning" size={14} color={colors.warning} />
                      <Text style={styles.warningText}>{worker.distanceFromSite}m</Text>
                    </View>
                  ) : (
                    <View style={styles.okBadge}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        {/* Exportar datos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Exportar datos</Text>
          
          <TouchableOpacity 
            style={[styles.exportButton, isExporting && styles.exportButtonDisabled]}
            onPress={() => handleExportCSV('records')}
            disabled={isExporting}
          >
            {isExporting ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Ionicons name="download-outline" size={20} color={colors.text} />
            )}
            <View style={styles.exportInfo}>
              <Text style={styles.exportTitle}>Exportar fichajes</Text>
              <Text style={styles.exportDesc}>Último mes en CSV</Text>
            </View>
            <Ionicons name="share-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.exportButton, isExporting && styles.exportButtonDisabled]}
            onPress={() => handleExportCSV('summary')}
            disabled={isExporting}
          >
            {isExporting ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Ionicons name="stats-chart-outline" size={20} color={colors.text} />
            )}
            <View style={styles.exportInfo}>
              <Text style={styles.exportTitle}>Resumen de horas</Text>
              <Text style={styles.exportDesc}>Por trabajador, último mes</Text>
            </View>
            <Ionicons name="share-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Actividad reciente */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🕐 Actividad reciente</Text>
          
          {dashboard?.recentActivity?.slice(0, 5).map((activity) => (
            <View key={activity.id} style={styles.activityItem}>
              <View style={[
                styles.activityIcon,
                activity.type === 'CLOCK_IN' ? styles.activityIn : styles.activityOut,
              ]}>
                <Ionicons 
                  name={activity.type === 'CLOCK_IN' ? 'enter-outline' : 'exit-outline'} 
                  size={16} 
                  color={activity.type === 'CLOCK_IN' ? colors.success : colors.error} 
                />
              </View>
              <View style={styles.activityInfo}>
                <Text style={styles.activityText}>{activity.worker}</Text>
                <Text style={styles.activityMeta}>
                  {activity.type === 'CLOCK_IN' ? 'Entrada' : 'Salida'} • {activity.worksite}
                </Text>
              </View>
              <Text style={styles.activityTime}>
                {new Date(activity.timestamp).toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.fontSize.md,
    color: colors.accent,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '15',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  alertText: {
    flex: 1,
    color: colors.warning,
    fontWeight: '600',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
  },
  workerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  workerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  workerAvatar: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workerInitials: {
    color: colors.text,
    fontWeight: '700',
    fontSize: typography.fontSize.sm,
  },
  workerDetails: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  workerName: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  workerMeta: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  workerStatus: {
    marginLeft: spacing.sm,
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    gap: 2,
  },
  warningText: {
    fontSize: typography.fontSize.xs,
    color: colors.warning,
    fontWeight: '600',
  },
  okBadge: {
    padding: 2,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  exportInfo: {
    flex: 1,
  },
  exportTitle: {
    fontSize: typography.fontSize.md,
    color: colors.text,
    fontWeight: '600',
  },
  exportDesc: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  exportButtonDisabled: {
    opacity: 0.6,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityIn: {
    backgroundColor: colors.success + '20',
  },
  activityOut: {
    backgroundColor: colors.error + '20',
  },
  activityInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  activityText: {
    fontSize: typography.fontSize.sm,
    color: colors.text,
    fontWeight: '600',
  },
  activityMeta: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
  activityTime: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionInfo: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  quickActionDesc: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
});
