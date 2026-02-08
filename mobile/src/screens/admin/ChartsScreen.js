import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../config/api';
import { colors, spacing, borderRadius, typography } from '../../config/theme';

const BarChart = ({ data, maxVal, color }) => {
  if (!data?.length) return null;
  const max = maxVal || Math.max(...data.map((d) => d.value), 1);
  return (
    <View style={styles.barChart}>
      {data.slice(0, 8).map((item, i) => (
        <View key={i} style={styles.barRow}>
          <Text style={styles.barLabel} numberOfLines={1}>
            {item.label}
          </Text>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                { width: `${Math.min(100, (item.value / max) * 100)}%`, backgroundColor: color },
              ]}
            />
          </View>
          <Text style={styles.barValue}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
};

export default function ChartsScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [chartsData, setChartsData] = useState(null);
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const dashRes = await api.get('/admin/dashboard');
      setDashboard(dashRes.data?.stats);
      try {
        const chartsRes = await api.get('/admin/charts-data');
        setChartsData(chartsRes.data);
      } catch (chartsErr) {
        if (chartsErr.response?.status === 404) {
          setChartsData({
            clocksByDay: [],
            hoursByWorksite: [],
            workerHours: [],
            outsideGeofenceCount: dashRes.data?.stats?.outsideGeofenceToday || 0,
          });
        } else {
          throw chartsErr;
        }
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Gráficas</Text>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Ionicons name="time" size={22} color={colors.accent} />
              <Text style={styles.summaryValue}>{dashboard?.todayClocks ?? 0}</Text>
              <Text style={styles.summaryLabel}>Fichajes hoy</Text>
            </View>
            <View style={styles.summaryCard}>
              <Ionicons name="people" size={22} color={colors.info} />
              <Text style={styles.summaryValue}>{dashboard?.activeNow ?? 0}</Text>
              <Text style={styles.summaryLabel}>En obra ahora</Text>
            </View>
            <View style={styles.summaryCard}>
              <Ionicons name="warning" size={22} color={colors.warning} />
              <Text style={styles.summaryValue}>{chartsData?.outsideGeofenceCount ?? 0}</Text>
              <Text style={styles.summaryLabel}>Fuera zona (7d)</Text>
            </View>
          </View>

          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Fichajes por día (últimos 7 días)</Text>
            <Text style={styles.chartSubtitle}>Tendencia de actividad en obra</Text>
            <BarChart
              data={(chartsData?.clocksByDay || []).map((d) => ({ label: d.label, value: d.clockCount }))}
              color={colors.accent}
            />
          </View>

          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Horas trabajadas por día</Text>
            <Text style={styles.chartSubtitle}>Productividad semanal</Text>
            <BarChart
              data={(chartsData?.clocksByDay || []).map((d) => ({ label: d.label, value: d.hours }))}
              color={colors.success}
            />
          </View>

          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Horas por obra</Text>
            <Text style={styles.chartSubtitle}>Distribución por proyecto</Text>
            <BarChart
              data={chartsData?.hoursByWorksite || []}
              color={colors.info}
            />
          </View>

          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Horas por trabajador</Text>
            <Text style={styles.chartSubtitle}>Últimos 7 días</Text>
            <BarChart
              data={chartsData?.workerHours || []}
              color={colors.primary}
            />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { padding: spacing.sm, marginRight: spacing.sm },
  title: { flex: 1, fontSize: typography.fontSize.xl, fontWeight: '700', color: colors.text },
  loading: { flex: 1, justifyContent: 'center' },
  content: { padding: spacing.lg },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.xs,
  },
  summaryLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  chartCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  chartTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  chartSubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  barChart: { gap: spacing.sm },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  barLabel: { width: 48, fontSize: typography.fontSize.xs, color: colors.textSecondary },
  barTrack: {
    flex: 1,
    height: 18,
    backgroundColor: colors.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 4 },
  barValue: { width: 32, fontSize: typography.fontSize.xs, color: colors.text, textAlign: 'right' },
});
