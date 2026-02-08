import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../config/api';
import { colors, spacing, borderRadius, typography } from '../../config/theme';

export default function HistoryScreen() {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('week'); // 'today', 'week', 'month'

  useEffect(() => {
    fetchHistory();
  }, [filter]);

  const getDateRange = () => {
    const now = new Date();
    let startDate = new Date();
    
    switch (filter) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
    }
    
    return { startDate: startDate.toISOString(), endDate: now.toISOString() };
  };

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      const { startDate, endDate } = getDateRange();
      
      const response = await api.get('/clock/history', {
        params: { startDate, endDate, limit: 100 },
      });
      
      setRecords(response.data.records);
      setSummary(response.data.summary);
    } catch (error) {
      console.error('Error obteniendo historial:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  }, [filter]);

  const groupRecordsByDate = () => {
    const grouped = {};
    
    records.forEach(record => {
      const date = new Date(record.timestamp).toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
      
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(record);
    });
    
    return Object.entries(grouped).map(([date, items]) => ({
      date,
      data: items.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)),
    }));
  };

  const renderRecord = ({ item }) => {
    const isEntry = item.type === 'CLOCK_IN';
    const time = new Date(item.timestamp).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <View style={styles.recordItem}>
        <View style={[
          styles.recordIcon,
          isEntry ? styles.recordIconIn : styles.recordIconOut,
        ]}>
          <Ionicons 
            name={isEntry ? 'enter-outline' : 'exit-outline'} 
            size={18} 
            color={isEntry ? colors.clockIn : colors.clockOut} 
          />
        </View>
        <View style={styles.recordInfo}>
          <Text style={styles.recordType}>
            {isEntry ? 'Entrada' : 'Salida'}
          </Text>
          {item.worksite && (
            <Text style={styles.recordWorksite}>{item.worksite.name}</Text>
          )}
        </View>
        <View style={styles.recordTime}>
          <Text style={styles.recordTimeText}>{time}</Text>
          {item.isWithinGeofence === false && (
            <View style={styles.warningBadge}>
              <Ionicons name="warning" size={12} color={colors.warning} />
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderDateSection = ({ item }) => {
    // Calcular horas del día
    let dayHours = 0;
    for (let i = 0; i < item.data.length; i++) {
      const record = item.data[i];
      if (record.type === 'CLOCK_IN') {
        const clockOut = item.data.find(
          (r, idx) => idx > i && r.type === 'CLOCK_OUT'
        );
        if (clockOut) {
          dayHours += (new Date(clockOut.timestamp) - new Date(record.timestamp)) / (1000 * 60 * 60);
        }
      }
    }

    return (
      <View style={styles.dateSection}>
        <View style={styles.dateHeader}>
          <Text style={styles.dateText}>{item.date}</Text>
          {dayHours > 0 && (
            <Text style={styles.dayHours}>{dayHours.toFixed(1)}h</Text>
          )}
        </View>
        {item.data.map((record, index) => (
          <View key={record.id || index}>
            {renderRecord({ item: record })}
          </View>
        ))}
      </View>
    );
  };

  const FilterButton = ({ value, label }) => (
    <TouchableOpacity
      style={[styles.filterButton, filter === value && styles.filterButtonActive]}
      onPress={() => setFilter(value)}
    >
      <Text style={[styles.filterText, filter === value && styles.filterTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Historial</Text>
      </View>

      {/* Filtros */}
      <View style={styles.filters}>
        <FilterButton value="today" label="Hoy" />
        <FilterButton value="week" label="Semana" />
        <FilterButton value="month" label="Mes" />
      </View>

      {/* Resumen */}
      {summary && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{summary.totalHours}h</Text>
            <Text style={styles.summaryLabel}>Total horas</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{summary.sessionsCount}</Text>
            <Text style={styles.summaryLabel}>Jornadas</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {summary.sessionsCount > 0 
                ? (parseFloat(summary.totalHours) / summary.sessionsCount).toFixed(1) 
                : '0'}h
            </Text>
            <Text style={styles.summaryLabel}>Media/día</Text>
          </View>
        </View>
      )}

      {/* Lista */}
      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : records.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="calendar-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyText}>No hay fichajes en este período</Text>
        </View>
      ) : (
        <FlatList
          data={groupRecordsByDate()}
          renderItem={renderDateSection}
          keyExtractor={(item) => item.date}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    fontSize: typography.fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
  },
  filterButtonActive: {
    backgroundColor: colors.accent,
  },
  filterText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterTextActive: {
    color: colors.text,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  summaryLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  dateSection: {
    marginBottom: spacing.lg,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dateText: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'capitalize',
  },
  dayHours: {
    fontSize: typography.fontSize.sm,
    color: colors.text,
    fontWeight: '600',
  },
  recordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  recordIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordIconIn: {
    backgroundColor: colors.clockIn + '20',
  },
  recordIconOut: {
    backgroundColor: colors.clockOut + '20',
  },
  recordInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  recordType: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  recordWorksite: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  recordTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  recordTimeText: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  warningBadge: {
    padding: 2,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
});
