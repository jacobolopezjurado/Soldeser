import React, { useState, useEffect, useCallback } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { api } from "../../config/api";
import { useAuth } from "../../contexts/AuthContext";
import { useOffline } from "../../contexts/OfflineContext";
import {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
} from "../../config/theme";

export default function HomeScreen() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPERVISOR";
  const {
    isOnline,
    pendingCount,
    savePendingRecord,
    syncPendingRecords,
    getNearestCachedWorksite,
  } = useOffline();

  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClocking, setIsClocking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [historyFilter, setHistoryFilter] = useState("week");
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historySummary, setHistorySummary] = useState(null);
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
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [status?.isClockedIn]);

  useEffect(() => {
    fetchStatus();
  }, []);
  useEffect(() => {
    fetchHistory();
  }, [historyFilter, isOnline]);

  const fetchStatus = async () => {
    try {
      setIsLoading(true);
      if (isOnline) {
        const response = await api.get("/clock/status");
        setStatus(response.data);
      }
    } catch (error) {
      console.error("Error obteniendo estado:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHistory = useCallback(async () => {
    if (!isOnline) return;
    try {
      const now = new Date();
      let startDate = new Date();
      switch (historyFilter) {
        case "today": startDate.setHours(0, 0, 0, 0); break;
        case "week": startDate.setDate(now.getDate() - 7); break;
        case "month": startDate.setMonth(now.getMonth() - 1); break;
      }
      const res = await api.get("/clock/history", {
        params: { startDate: startDate.toISOString(), endDate: now.toISOString(), limit: 100 },
      });
      setHistoryRecords(res.data.records || []);
      setHistorySummary(res.data.summary || null);
    } catch (err) {
      console.error("Error historial:", err);
    }
  }, [isOnline, historyFilter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStatus();
    await fetchHistory();
    if (isOnline && pendingCount > 0) {
      await syncPendingRecords();
    }
    setRefreshing(false);
  }, [isOnline, pendingCount, fetchHistory]);

  const handleClock = async (type) => {
    setIsClocking(true);

    try {
      // Solicitar permiso de ubicación
      const { status: permStatus } =
        await Location.requestForegroundPermissionsAsync();
      if (permStatus !== "granted") {
        Alert.alert(
          "Permiso requerido",
          "Necesitamos acceso a tu ubicación para verificar tu presencia en la obra.",
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
        const endpoint = type === "in" ? "/clock/in" : "/clock/out";
        const response = await api.post(endpoint, clockData);

        Alert.alert(
          type === "in" ? "✅ Entrada fichada" : "✅ Salida fichada",
          response.data.message,
          [{ text: "OK" }],
        );

        if (response.data.warnings?.length > 0) {
          setTimeout(() => {
            Alert.alert("⚠️ Aviso", response.data.warnings.join("\n"));
          }, 500);
        }
      } else {
        // Fichar offline
        const nearestWorksite = getNearestCachedWorksite(
          location.coords.latitude,
          location.coords.longitude,
        );

        await savePendingRecord({
          type: type === "in" ? "CLOCK_IN" : "CLOCK_OUT",
          ...clockData,
          worksiteId: nearestWorksite?.id,
        });

        Alert.alert(
          "📱 Guardado offline",
          "El fichaje se ha guardado localmente y se sincronizará cuando tengas conexión.",
        );
      }

      await fetchStatus();
    } catch (error) {
      console.error("Error fichando:", error);
      const message =
        error.response?.data?.error || "Error al fichar. Inténtalo de nuevo.";
      Alert.alert("Error", message);
    } finally {
      setIsClocking(false);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  const handleExportCSV = async (type) => {
    try {
      setIsExporting(true);
      const today = new Date();
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      const endpoint = type === "records" ? "/export/clock-records/csv" : "/export/hours-summary/csv";
      const response = await api.get(endpoint, {
        params: { startDate: monthAgo.toISOString(), endDate: today.toISOString() },
        responseType: "text",
      });
      const filename = type === "records" ? `fichajes_${today.toISOString().split("T")[0]}.csv` : `resumen_horas_${today.toISOString().split("T")[0]}.csv`;
      const fileUri = FileSystem.documentDirectory + filename;
      await FileSystem.writeAsStringAsync(fileUri, response.data);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "text/csv",
          dialogTitle: "Exportar fichajes",
          UTI: "public.comma-separated-values-text",
        });
      } else {
        Alert.alert("Éxito", `Archivo guardado en: ${fileUri}`);
      }
    } catch (error) {
      console.error("Error exportando:", error);
      Alert.alert("Error", "No se pudo exportar. Verifica tu conexión.");
    } finally {
      setIsExporting(false);
    }
  };

  const isClockedIn = status?.isClockedIn || false;

  const groupRecordsByDate = () => {
    const grouped = {};
    historyRecords.forEach((record) => {
      const date = new Date(record.timestamp).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(record);
    });
    return Object.entries(grouped).map(([date, data]) => ({ date, data: data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)) }));
  };

  const renderHistoryRecord = (item) => {
    const isEntry = item.type === "CLOCK_IN";
    const time = new Date(item.timestamp).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
    return (
      <View key={item.id} style={styles.recordItem}>
        <View style={[styles.recordIcon, isEntry ? styles.recordIconIn : styles.recordIconOut]}>
          <Ionicons name={isEntry ? "enter-outline" : "exit-outline"} size={18} color={isEntry ? colors.clockIn : colors.clockOut} />
        </View>
        <View style={styles.recordInfo}>
          <Text style={styles.recordType}>{isEntry ? "Entrada" : "Salida"}</Text>
          {item.worksite && <Text style={styles.recordWorksite}>{item.worksite.name}</Text>}
        </View>
        <Text style={styles.recordTimeText}>{time}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
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
        <View style={styles.header}>
          <Text style={styles.greeting}>Hola, {user?.firstName}</Text>
          {!isOnline && (
            <View style={styles.offlineBadge}>
              <Ionicons name="cloud-offline" size={14} color={colors.warning} />
              <Text style={styles.offlineText}>Sin conexión</Text>
            </View>
          )}
        </View>

        <View style={styles.clockContainer}>
          <Text style={styles.time}>{formatTime(currentTime)}</Text>
          <Text style={styles.date}>{formatDate(currentTime)}</Text>
        </View>

        <View
          style={[
            styles.statusCard,
            isClockedIn ? styles.statusCardActive : styles.statusCardInactive,
          ]}
        >
          <View style={styles.statusIndicator}>
            <View
              style={[
                styles.statusDot,
                isClockedIn ? styles.statusDotActive : styles.statusDotInactive,
              ]}
            />
            <Text style={styles.statusText}>
              {isLoading
                ? "Cargando..."
                : isClockedIn
                  ? "EN JORNADA"
                  : "FUERA DE JORNADA"}
            </Text>
          </View>

          {isClockedIn && status?.currentSession && (
            <View style={styles.sessionInfo}>
              <Text style={styles.sessionLabel}>Entrada:</Text>
              <Text style={styles.sessionValue}>
                {new Date(status.currentSession.entryTime).toLocaleTimeString(
                  "es-ES",
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                  },
                )}
              </Text>
              <Text style={styles.sessionLabel}>Horas:</Text>
              <Text style={styles.sessionValue}>
                {status.currentSession.hoursWorked}h
              </Text>
            </View>
          )}

          {status?.currentSession?.worksite && (
            <View style={styles.worksiteInfo}>
              <Ionicons
                name="location"
                size={16}
                color={colors.textSecondary}
              />
              <Text style={styles.worksiteName}>
                {status.currentSession.worksite.name}
              </Text>
            </View>
          )}
        </View>

        <Animated.View
          style={{ transform: [{ scale: isClockedIn ? pulseAnim : 1 }] }}
        >
          <TouchableOpacity
            style={[
              styles.clockButton,
              isClockedIn ? styles.clockOutButton : styles.clockInButton,
              isClocking && styles.clockButtonDisabled,
            ]}
            onPress={() => handleClock(isClockedIn ? "out" : "in")}
            disabled={isClocking || isLoading}
          >
            {isClocking ? (
              <ActivityIndicator size="large" color={colors.text} />
            ) : (
              <>
                <Ionicons
                  name={isClockedIn ? "exit-outline" : "enter-outline"}
                  size={48}
                  color={colors.text}
                />
                <Text style={styles.clockButtonText}>
                  {isClockedIn ? "FICHAR SALIDA" : "FICHAR ENTRADA"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

        {pendingCount > 0 && (
          <View style={styles.pendingCard}>
            <Ionicons name="sync" size={20} color={colors.warning} />
            <Text style={styles.pendingText}>
              {pendingCount} fichaje{pendingCount > 1 ? "s" : ""} pendiente
              {pendingCount > 1 ? "s" : ""} de sincronizar
            </Text>
            {isOnline && (
              <TouchableOpacity onPress={syncPendingRecords}>
                <Text style={styles.syncButton}>Sincronizar</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.infoCard}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={colors.textSecondary}
          />
          <Text style={styles.infoText}>
            Tu ubicación se registrará únicamente al fichar para verificar tu
            presencia en la obra.
          </Text>
        </View>

        {isAdmin && (
          <View style={styles.exportSection}>
            <Text style={styles.exportSectionTitle}>Exportar datos</Text>
            <TouchableOpacity
              style={[styles.exportButton, isExporting && styles.exportButtonDisabled]}
              onPress={() => handleExportCSV("records")}
              disabled={isExporting}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <Ionicons name="download-outline" size={20} color={colors.text} />
              )}
              <Text style={styles.exportButtonText}>Exportar fichajes (último mes)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.exportButton, isExporting && styles.exportButtonDisabled]}
              onPress={() => handleExportCSV("summary")}
              disabled={isExporting}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <Ionicons name="stats-chart-outline" size={20} color={colors.text} />
              )}
              <Text style={styles.exportButtonText}>Resumen de horas (último mes)</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.historySection}>
          <Text style={styles.historySectionTitle}>Historial</Text>
          <View style={styles.historyFilters}>
            {["today", "week", "month"].map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.historyFilterBtn, historyFilter === f && styles.historyFilterActive]}
                onPress={() => setHistoryFilter(f)}
              >
                <Text style={[styles.historyFilterText, historyFilter === f && styles.historyFilterTextActive]}>
                  {f === "today" ? "Hoy" : f === "week" ? "Semana" : "Mes"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {historySummary && (
            <View style={styles.historySummary}>
              <View style={styles.historySummaryItem}>
                <Text style={styles.historySummaryValue}>{historySummary.totalHours}h</Text>
                <Text style={styles.historySummaryLabel}>Total</Text>
              </View>
              <View style={[styles.historySummaryItem, styles.historySummaryDivider]}>
                <Text style={styles.historySummaryValue}>{historySummary.sessionsCount}</Text>
                <Text style={styles.historySummaryLabel}>Jornadas</Text>
              </View>
              <View style={styles.historySummaryItem}>
                <Text style={styles.historySummaryValue}>
                  {historySummary.sessionsCount > 0 ? (parseFloat(historySummary.totalHours) / historySummary.sessionsCount).toFixed(1) : "0"}h
                </Text>
                <Text style={styles.historySummaryLabel}>Media/día</Text>
              </View>
            </View>
          )}
          {historyRecords.length === 0 ? (
            <View style={styles.historyEmpty}>
              <Ionicons name="calendar-outline" size={40} color={colors.textSecondary} />
              <Text style={styles.historyEmptyText}>No hay fichajes en este período</Text>
            </View>
          ) : (
            groupRecordsByDate().map((sec) => {
              let dayH = 0;
              for (let i = 0; i < sec.data.length; i++) {
                if (sec.data[i].type === "CLOCK_IN") {
                  const out = sec.data.find((x, j) => j > i && x.type === "CLOCK_OUT");
                  if (out) dayH += (new Date(out.timestamp) - new Date(sec.data[i].timestamp)) / (1000 * 60 * 60);
                }
              }
              return (
                <View key={sec.date} style={styles.dateSection}>
                  <View style={styles.dateHeader}>
                    <Text style={styles.dateText}>{sec.date}</Text>
                    {dayH > 0 && <Text style={styles.dayHours}>{dayH.toFixed(1)}h</Text>}
                  </View>
                  {sec.data.map((r) => renderHistoryRecord(r))}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

import { Platform } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  greeting: {
    fontSize: typography.fontSize.xl,
    fontWeight: "700",
    color: colors.text,
  },
  offlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.warning + "20",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  offlineText: {
    fontSize: typography.fontSize.xs,
    color: colors.warning,
    fontWeight: "600",
  },
  clockContainer: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  time: {
    fontSize: 56,
    fontWeight: "200",
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  date: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    textTransform: "capitalize",
  },
  statusCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
  },
  statusCardActive: {
    backgroundColor: colors.success + "10",
    borderColor: colors.success + "30",
  },
  statusCardInactive: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
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
    fontWeight: "700",
    color: colors.text,
    letterSpacing: 1,
  },
  sessionInfo: {
    flexDirection: "row",
    alignItems: "center",
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
    fontWeight: "600",
  },
  worksiteInfo: {
    flexDirection: "row",
    alignItems: "center",
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
    justifyContent: "center",
    alignItems: "center",
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
    fontWeight: "800",
    color: colors.text,
    marginTop: spacing.sm,
    letterSpacing: 2,
  },
  pendingCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.warning + "10",
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
    fontWeight: "600",
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
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
  exportSection: {
    marginTop: spacing.lg,
  },
  exportSectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  exportButtonDisabled: {
    opacity: 0.6,
  },
  exportButtonText: {
    fontSize: typography.fontSize.md,
    color: colors.text,
    fontWeight: "600",
  },
  historySection: {
    marginTop: spacing.xl,
  },
  historySectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  historyFilters: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  historyFilterBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
  },
  historyFilterActive: {
    backgroundColor: colors.accent,
  },
  historyFilterText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  historyFilterTextActive: {
    color: colors.text,
  },
  historySummary: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  historySummaryItem: {
    flex: 1,
    alignItems: "center",
  },
  historySummaryDivider: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
  },
  historySummaryValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: "700",
    color: colors.text,
  },
  historySummaryLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  historyEmpty: {
    alignItems: "center",
    padding: spacing.xl,
  },
  historyEmptyText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  dateSection: {
    marginBottom: spacing.lg,
  },
  dateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  dateText: {
    fontSize: typography.fontSize.md,
    fontWeight: "600",
    color: colors.text,
    textTransform: "capitalize",
  },
  dayHours: {
    fontSize: typography.fontSize.sm,
    color: colors.text,
    fontWeight: "600",
  },
  recordItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  recordIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  recordIconIn: {
    backgroundColor: colors.clockIn + "20",
  },
  recordIconOut: {
    backgroundColor: colors.clockOut + "20",
  },
  recordInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  recordType: {
    fontSize: typography.fontSize.md,
    fontWeight: "600",
    color: colors.text,
  },
  recordWorksite: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  recordTimeText: {
    fontSize: typography.fontSize.md,
    fontWeight: "600",
    color: colors.text,
  },
});
