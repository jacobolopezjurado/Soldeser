import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Dimensions,
  LayoutAnimation,
} from 'react-native';
import MapView, { Circle } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { api } from '../../config/api';
import { colors, spacing, borderRadius, typography } from '../../config/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAP_HEIGHT = 220;

export default function WorksitesManagement() {
  const navigation = useNavigation();
  const [worksites, setWorksites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    latitude: null,
    longitude: null,
    radiusMeters: 100,
  });

  const fetchWorksites = useCallback(async () => {
    try {
      const res = await api.get('/worksites');
      setWorksites(res.data.worksites || []);
    } catch (err) {
      console.error('Error cargando obras:', err);
      Alert.alert('Error', 'No se pudieron cargar las obras');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchWorksites();
  }, [fetchWorksites]);

  const openCreateModal = async () => {
    setFormData({
      name: '',
      address: '',
      city: '',
      latitude: null,
      longitude: null,
      radiusMeters: 100,
    });
    setModalVisible(true);
  };

  const geocodeAddress = async () => {
    const { address, city } = formData;
    if (!address?.trim() || !city?.trim()) {
      Alert.alert('Dirección', 'Completa dirección y ciudad para buscar en el mapa');
      return;
    }
    try {
      setGeocoding(true);
      const fullAddress = `${address.trim()}, ${city.trim()}`;
      const results = await Location.geocodeAsync(fullAddress);
      if (!results?.length) {
        Alert.alert('No encontrado', 'No se pudo localizar la dirección. Prueba con otra más específica.');
        return;
      }
      const { latitude, longitude } = results[0];
      setFormData(prev => ({
        ...prev,
        latitude,
        longitude,
        radiusMeters: prev.radiusMeters || 100,
      }));
    } catch (err) {
      console.error('Geocoding error:', err);
      Alert.alert('Error', 'No se pudo geocodificar la dirección');
    } finally {
      setGeocoding(false);
    }
  };

  const handleCreate = async () => {
    const { name, address, city, latitude, longitude, radiusMeters } = formData;
    if (!name?.trim() || !address?.trim() || !city?.trim()) {
      Alert.alert('Campos requeridos', 'Completa nombre, dirección y ciudad');
      return;
    }
    if (latitude == null || longitude == null) {
      Alert.alert('Mapa', 'Pulsa "Buscar en mapa" y asegúrate de que la ubicación aparezca con el círculo');
      return;
    }
    try {
      setSaving(true);
      await api.post('/worksites', {
        name: name.trim(),
        address: address.trim(),
        city: city.trim(),
        latitude,
        longitude,
        radiusMeters: radiusMeters || 100,
      });
      setModalVisible(false);
      fetchWorksites();
      Alert.alert('Éxito', 'Obra creada correctamente');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'No se pudo crear la obra');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (worksite) => {
    Alert.alert('Eliminar obra', `¿Eliminar permanentemente "${worksite.name}"? Esta acción no se puede deshacer.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          setDeletingId(worksite.id);
          slideAnim.setValue(0);
          Animated.timing(slideAnim, {
            toValue: 1,
            duration: 280,
            useNativeDriver: true,
          }).start(async ({ finished }) => {
            if (!finished) return;
            setDeletingId(null);
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setWorksites((prev) => prev.filter((w) => w.id !== worksite.id));
            try {
              await api.delete(`/worksites/${worksite.id}`);
            } catch (err) {
              setWorksites((prev) => [...prev, worksite]);
              Alert.alert('Error', err.response?.data?.error || 'No se pudo eliminar');
            }
          });
        },
      },
    ]);
  };

  const renderWorksite = ({ item }) => {
    const isDeleting = item.id === deletingId;
    return (
      <Animated.View
        style={[
          styles.cardWrapper,
          isDeleting && {
            transform: [
              {
                translateX: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, SCREEN_WIDTH],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.card}>
          <View style={styles.cardContent}>
            <Text style={styles.cardName}>{item.name}</Text>
            <Text style={styles.cardAddress}>{item.address}, {item.city}</Text>
            <Text style={styles.cardCoords}>
              📍 {item.latitude?.toFixed(4)}, {item.longitude?.toFixed(4)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(item)}
          >
            <Ionicons name="trash-outline" size={20} color={colors.error} />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Obras</Text>
        <TouchableOpacity onPress={openCreateModal} style={styles.addBtn}>
          <Ionicons name="add" size={28} color={colors.accent} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={worksites}
          keyExtractor={(item) => item.id}
          renderItem={renderWorksite}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchWorksites(); }} tintColor={colors.accent} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="business-outline" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No hay obras</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={openCreateModal}>
                <Text style={styles.emptyBtnText}>Crear obra</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nueva obra</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>Nombre *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Obra Centro"
                placeholderTextColor={colors.textMuted}
                value={formData.name}
                onChangeText={(t) => setFormData(prev => ({ ...prev, name: t }))}
              />
              <Text style={styles.label}>Dirección *</Text>
              <TextInput
                style={styles.input}
                placeholder="Dirección completa"
                placeholderTextColor={colors.textMuted}
                value={formData.address}
                onChangeText={(t) => setFormData(prev => ({ ...prev, address: t }))}
              />
              <Text style={styles.label}>Ciudad *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ciudad"
                placeholderTextColor={colors.textMuted}
                value={formData.city}
                onChangeText={(t) => setFormData(prev => ({ ...prev, city: t }))}
              />

              <Text style={styles.label}>Mapa - Ubicación y área</Text>
              <TouchableOpacity
                style={styles.locationBtn}
                onPress={geocodeAddress}
                disabled={geocoding}
              >
                {geocoding ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <Ionicons name="map" size={20} color={colors.accent} />
                )}
                <Text style={styles.locationBtnText}>Buscar dirección en mapa</Text>
              </TouchableOpacity>

              {formData.latitude != null && formData.longitude != null && (
                <>
                  <View style={styles.mapContainer}>
                    <MapView
                      style={styles.map}
                      initialRegion={{
                        latitude: formData.latitude,
                        longitude: formData.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                      }}
                    >
                      <Circle
                        center={{ latitude: formData.latitude, longitude: formData.longitude }}
                        radius={formData.radiusMeters}
                        fillColor={colors.accent + '40'}
                        strokeColor={colors.accent}
                        strokeWidth={2}
                      />
                    </MapView>
                  </View>
                  <View style={styles.radiusControl}>
                    <Text style={styles.radiusLabel}>Radio del círculo: {formData.radiusMeters} m</Text>
                    <View style={styles.radiusButtons}>
                      <TouchableOpacity
                        style={styles.radiusBtn}
                        onPress={() => setFormData(prev => ({ ...prev, radiusMeters: Math.max(50, (prev.radiusMeters || 100) - 25) }))}
                      >
                        <Ionicons name="remove" size={24} color={colors.text} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.radiusBtn}
                        onPress={() => setFormData(prev => ({ ...prev, radiusMeters: Math.min(500, (prev.radiusMeters || 100) + 25) }))}
                      >
                        <Ionicons name="add" size={24} color={colors.text} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              )}
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleCreate}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color={colors.text} /> : <Text style={styles.saveBtnText}>Crear obra</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { padding: spacing.sm, marginRight: spacing.sm },
  title: { flex: 1, fontSize: typography.fontSize.xl, fontWeight: '700', color: colors.text },
  addBtn: { padding: spacing.sm },
  loading: { flex: 1, justifyContent: 'center' },
  list: { padding: spacing.lg },
  cardWrapper: {},
  card: { flexDirection: 'row', backgroundColor: colors.surface, padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.md },
  cardContent: { flex: 1 },
  cardName: { fontSize: typography.fontSize.md, fontWeight: '700', color: colors.text },
  cardAddress: { fontSize: typography.fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  cardCoords: { fontSize: typography.fontSize.xs, color: colors.textMuted, marginTop: 2 },
  deleteBtn: { padding: spacing.sm, justifyContent: 'center' },
  empty: { alignItems: 'center', padding: spacing.xxl },
  emptyText: { fontSize: typography.fontSize.md, color: colors.textSecondary, marginTop: spacing.md },
  emptyBtn: { backgroundColor: colors.accent, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: borderRadius.md, marginTop: spacing.lg },
  emptyBtnText: { color: colors.text, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, maxHeight: '90%', padding: spacing.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  modalTitle: { fontSize: typography.fontSize.xl, fontWeight: '700', color: colors.text },
  label: { fontSize: typography.fontSize.sm, color: colors.textSecondary, marginBottom: spacing.xs },
  input: { backgroundColor: colors.background, borderRadius: borderRadius.md, padding: spacing.md, color: colors.text, marginBottom: spacing.md },
  locationBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  locationBtnText: { fontSize: typography.fontSize.md, color: colors.accent, fontWeight: '600' },
  mapContainer: { height: MAP_HEIGHT, borderRadius: borderRadius.md, overflow: 'hidden', marginBottom: spacing.md },
  map: { flex: 1, width: '100%', height: '100%' },
  radiusControl: { marginBottom: spacing.md },
  radiusLabel: { fontSize: typography.fontSize.sm, color: colors.textSecondary, marginBottom: spacing.sm },
  radiusButtons: { flexDirection: 'row', gap: spacing.md },
  radiusBtn: { backgroundColor: colors.background, padding: spacing.md, borderRadius: borderRadius.md },
  saveBtn: { backgroundColor: colors.accent, padding: spacing.lg, borderRadius: borderRadius.md, alignItems: 'center', marginTop: spacing.md },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: colors.text, fontWeight: '700' },
});
