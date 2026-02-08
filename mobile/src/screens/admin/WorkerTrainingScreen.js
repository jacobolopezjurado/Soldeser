import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../config/api';
import { colors, spacing, borderRadius, typography } from '../../config/theme';

const formatDate = (d) => {
  if (!d || !(d instanceof Date)) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

export default function WorkerTrainingScreen() {
  const navigation = useNavigation();
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);

  const [courseType, setCourseType] = useState('');
  const [courseDate, setCourseDate] = useState('');
  const [epiItem, setEpiItem] = useState('');
  const [epiDate, setEpiDate] = useState('');
  const [medicalDate, setMedicalDate] = useState('');
  const [datePickerType, setDatePickerType] = useState(null);

  const fetchWorkers = useCallback(async () => {
    try {
      const res = await api.get('/users', { params: { limit: 100 } });
      setWorkers((res.data.users || []).filter((u) => u.role === 'WORKER'));
    } catch (err) {
      console.error('Error:', err);
      Alert.alert('Error', 'No se pudieron cargar los trabajadores');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  const openWorkerDetail = (worker) => {
    setSelectedWorker(worker);
    setCourseType('');
    setCourseDate('');
    setEpiItem('');
    setEpiDate('');
    setMedicalDate('');
    setDatePickerType(null);
    setDetailModalVisible(true);
  };

  const getDateForPicker = (dateStr) => {
    if (!dateStr) return new Date();
    const parts = dateStr.split('/');
    if (parts.length !== 3) return new Date();
    const d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const handleDateChange = (event, date) => {
    const type = datePickerType;
    setDatePickerType(null);
    if (event.type === 'set' && date && type) {
      const formatted = formatDate(date);
      if (type === 'course') setCourseDate(formatted);
      else if (type === 'epi') setEpiDate(formatted);
      else if (type === 'medical') setMedicalDate(formatted);
    }
  };

  const renderWorker = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => openWorkerDetail(item)}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.firstName?.[0]}{item.lastName?.[0]}</Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardName}>{item.firstName} {item.lastName}</Text>
        <Text style={styles.cardDni}>{item.dni}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Cursos y formación</Text>
      </View>

      <View style={styles.infoBanner}>
        <Ionicons name="information-circle" size={20} color={colors.info} />
        <Text style={styles.infoText}>
          Selecciona un trabajador para añadir cursos (gruista, carnet…), revisión médica y entregas de EPIs.
        </Text>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={workers}
          keyExtractor={(item) => item.id}
          renderItem={renderWorker}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchWorkers(); }} tintColor={colors.accent} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No hay trabajadores</Text>
            </View>
          }
        />
      )}

      <Modal visible={detailModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedWorker ? `${selectedWorker.firstName} ${selectedWorker.lastName}` : ''}
              </Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Cursos</Text>
                <Text style={styles.hint}>Ej: Gruista, Carnet de gruista...</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Tipo de curso"
                  placeholderTextColor={colors.textMuted}
                  value={courseType}
                  onChangeText={setCourseType}
                />
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setDatePickerType('course')}
                >
                  <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                  <Text style={[styles.dateInput, !courseDate && styles.datePlaceholder]}>
                    {courseDate || 'DD/MM/AAAA'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.addBtn}>
                  <Ionicons name="add" size={20} color={colors.text} />
                  <Text style={styles.addBtnText}>Añadir curso</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>EPIs entregados</Text>
                <Text style={styles.hint}>Materiales de seguridad</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Casco, Chaleco, Botas..."
                  placeholderTextColor={colors.textMuted}
                  value={epiItem}
                  onChangeText={setEpiItem}
                />
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setDatePickerType('epi')}
                >
                  <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                  <Text style={[styles.dateInput, !epiDate && styles.datePlaceholder]}>
                    {epiDate || 'Fecha entrega (DD/MM/AAAA)'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.addBtn}>
                  <Ionicons name="add" size={20} color={colors.text} />
                  <Text style={styles.addBtnText}>Registrar EPI</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Revisión médica</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setDatePickerType('medical')}
                >
                  <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                  <Text style={[styles.dateInput, !medicalDate && styles.datePlaceholder]}>
                    {medicalDate || 'Última revisión (DD/MM/AAAA)'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.addBtn}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.text} />
                  <Text style={styles.addBtnText}>Guardar revisión</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.comingSoon}>
                <Ionicons name="construct-outline" size={32} color={colors.textMuted} />
                <Text style={styles.comingSoonText}>
                  La persistencia de cursos, EPIs y revisiones médicas se implementará en el backend próximamente.
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {datePickerType && (
        <DateTimePicker
          value={
            datePickerType === 'course'
              ? getDateForPicker(courseDate)
              : datePickerType === 'epi'
              ? getDateForPicker(epiDate)
              : getDateForPicker(medicalDate)
          }
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          onDismiss={() => setDatePickerType(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { padding: spacing.sm, marginRight: spacing.sm },
  title: { flex: 1, fontSize: typography.fontSize.xl, fontWeight: '700', color: colors.text },
  infoBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.info + '15', padding: spacing.md, margin: spacing.lg, borderRadius: borderRadius.md, gap: spacing.sm },
  infoText: { flex: 1, fontSize: typography.fontSize.sm, color: colors.textSecondary },
  loading: { flex: 1, justifyContent: 'center' },
  list: { padding: spacing.lg },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.md },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: colors.text, fontWeight: '700', fontSize: typography.fontSize.sm },
  cardContent: { flex: 1, marginLeft: spacing.md },
  cardName: { fontSize: typography.fontSize.md, fontWeight: '700', color: colors.text },
  cardDni: { fontSize: typography.fontSize.sm, color: colors.textSecondary },
  empty: { alignItems: 'center', padding: spacing.xxl },
  emptyText: { fontSize: typography.fontSize.md, color: colors.textSecondary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, maxHeight: '90%', padding: spacing.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  modalTitle: { fontSize: typography.fontSize.xl, fontWeight: '700', color: colors.text },
  section: { marginBottom: spacing.xl },
  sectionTitle: { fontSize: typography.fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  hint: { fontSize: typography.fontSize.xs, color: colors.textMuted, marginBottom: spacing.xs },
  input: { backgroundColor: colors.background, borderRadius: borderRadius.md, padding: spacing.md, color: colors.text, marginBottom: spacing.sm },
  dateButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.background, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm },
  dateInput: { flex: 1, fontSize: typography.fontSize.md, color: colors.text, padding: 0 },
  datePlaceholder: { color: colors.textMuted },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.accent, padding: spacing.md, borderRadius: borderRadius.md },
  addBtnText: { color: colors.text, fontWeight: '600' },
  comingSoon: { alignItems: 'center', padding: spacing.xl, marginTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
  comingSoonText: { fontSize: typography.fontSize.sm, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm },
});
