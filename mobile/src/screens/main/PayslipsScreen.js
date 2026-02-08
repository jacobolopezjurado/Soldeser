import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Dimensions,
  Linking,
  TextInput,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../../contexts/AuthContext';
import { api, API_URL } from '../../config/api';
import { colors, spacing, borderRadius, typography } from '../../config/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function PayslipsScreen() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERVISOR';

  const [payslips, setPayslips] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(user?.id || null);
  const [isUploading, setIsUploading] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  const fetchPayslips = useCallback(async () => {
    setLoadError(null);
    try {
      let res;
      try {
        res = await api.get('/payslips');
      } catch (err) {
        if (err.response?.status === 404 && isAdmin) {
          res = await api.get('/admin/payslips');
        } else {
          throw err;
        }
      }
      setPayslips(res.data.payslips || []);
    } catch (err) {
      console.error('Error cargando nóminas:', err);
      setLoadError(err.response?.status === 404
        ? 'El servidor no tiene la ruta de nóminas. Redespliega el backend.'
        : err.message || 'Error al cargar');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin]);

  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await api.get('/users', { params: { limit: 100 } });
      setUsers(res.data.users || []);
    } catch (err) {
      console.error('Error cargando usuarios:', err);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchPayslips();
  }, [fetchPayslips]);

  useEffect(() => {
    if (uploadModalVisible && isAdmin) {
      fetchUsers();
    }
  }, [uploadModalVisible, isAdmin, fetchUsers]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPayslips();
  }, [fetchPayslips]);

  const openUploadModal = () => {
    setSelectedUserId(user?.id || null);
    setUserSearch('');
    setUploadModalVisible(true);
  };

  const pickAndUpload = async (launchFn) => {
    try {
      const result = await launchFn({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (result.canceled) return;

      setIsUploading(true);
      const asset = result.assets[0];
      const uri = asset.uri;
      const filename = asset.fileName || uri.split('/').pop() || 'nomina.jpg';
      const match = filename.match(/\.(\w+)$/);
      const ext = match ? match[1].toLowerCase() : 'jpg';
      const mimeTypes = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', heic: 'image/heic', webp: 'image/webp' };
      const type = mimeTypes[ext] || 'image/jpeg';
      const safeName = filename.includes('.') ? filename : `nomina.${ext === 'heic' ? 'jpg' : ext}`;

      const formData = new FormData();
      formData.append('image', { uri, name: safeName, type });
      const assignTo = selectedUserId || user?.id;
      if (assignTo) formData.append('assignedToUserId', assignTo);

      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_URL}/payslips/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${response.status}`);
      }

      setUploadModalVisible(false);
      fetchPayslips();
      Alert.alert('Éxito', 'Nómina subida correctamente.');
    } catch (err) {
      Alert.alert('Error', err.message || 'No se pudo subir la nómina.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpload = () => {
    Alert.alert('Subir nómina', '¿Cómo quieres añadir la foto?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Hacer foto',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara.');
            return;
          }
          pickAndUpload(ImagePicker.launchCameraAsync);
        },
      },
      {
        text: 'Elegir de galería',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permiso requerido', 'Necesitamos acceso a la galería.');
            return;
          }
          pickAndUpload(ImagePicker.launchImageLibraryAsync);
        },
      },
    ]);
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredUsers = users.filter(
    (u) =>
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Nóminas</Text>
        <TouchableOpacity style={styles.uploadButton} onPress={openUploadModal}>
          <Ionicons name="add-circle" size={28} color={colors.accent} />
          <Text style={styles.uploadButtonText}>Subir</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : loadError ? (
        <View style={styles.empty}>
          <Ionicons name="warning-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>Error al cargar</Text>
          <Text style={styles.emptyText}>{loadError}</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={onRefresh}>
            <Text style={styles.emptyButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : payslips.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="document-text-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>No hay nóminas</Text>
          <Text style={styles.emptyText}>
            {isAdmin ? 'Sube nóminas y asígnalas a cualquier trabajador.' : 'Tus nóminas aparecerán aquí.'}
          </Text>
          <TouchableOpacity style={styles.emptyButton} onPress={openUploadModal}>
            <Text style={styles.emptyButtonText}>Subir nómina</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }
        >
          {payslips.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.workerName}>
                    {item.user?.firstName} {item.user?.lastName}
                  </Text>
                  {item.uploadedBy && item.uploadedBy.id !== item.user?.id && (
                    <Text style={styles.uploadedBy}>
                      Subida por {item.uploadedBy.firstName} {item.uploadedBy.lastName}
                    </Text>
                  )}
                  <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.imageContainer}
                onPress={() => setSelectedImage(item.fileUrl)}
              >
                <Image source={{ uri: item.fileUrl }} style={styles.thumbnail} resizeMode="contain" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.openButton}
                onPress={() => Linking.openURL(item.fileUrl)}
              >
                <Ionicons name="open-outline" size={18} color={colors.accent} />
                <Text style={styles.openButtonText}>Abrir imagen</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Modal subir */}
      <Modal visible={uploadModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Subir nómina</Text>
              <TouchableOpacity onPress={() => setUploadModalVisible(false)}>
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>

            {isAdmin && (
              <View style={styles.assignSection}>
                <Text style={styles.assignLabel}>Asignar a</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar por nombre o email..."
                  placeholderTextColor={colors.textMuted}
                  value={userSearch}
                  onChangeText={setUserSearch}
                />
                <FlatList
                  data={filteredUsers}
                  keyExtractor={(item) => item.id}
                  style={styles.userList}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.userItem, selectedUserId === item.id && styles.userItemSelected]}
                      onPress={() => setSelectedUserId(item.id)}
                    >
                      <Text style={styles.userItemText}>
                        {item.firstName} {item.lastName}
                      </Text>
                      <Text style={styles.userItemEmail}>{item.email}</Text>
                      {selectedUserId === item.id && (
                        <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
                      )}
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <Text style={styles.emptyListText}>No se encontraron usuarios</Text>
                  }
                />
              </View>
            )}

            <TouchableOpacity
              style={[styles.uploadModalButton, isUploading && styles.uploadModalButtonDisabled]}
              onPress={handleUpload}
              disabled={isUploading}
            >
              {isUploading ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <>
                  <Ionicons name="camera" size={24} color={colors.text} />
                  <Text style={styles.uploadModalButtonText}>Elegir foto o hacer captura</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal ver imagen */}
      <Modal
        visible={!!selectedImage}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <TouchableOpacity
          style={styles.imageModalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedImage(null)}
        >
          <View style={styles.imageModalContent}>
            {selectedImage && (
              <Image
                source={{ uri: selectedImage }}
                style={styles.modalImage}
                resizeMode="contain"
              />
            )}
            <TouchableOpacity
              style={styles.closeImageButton}
              onPress={() => setSelectedImage(null)}
            >
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: typography.fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  uploadButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.accent,
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
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.md,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  emptyButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
  },
  emptyButtonText: {
    color: colors.text,
    fontWeight: '600',
  },
  list: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: {
    marginBottom: spacing.md,
  },
  workerName: {
    fontSize: typography.fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  uploadedBy: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  dateText: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  imageContainer: {
    width: '100%',
    height: 180,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  openButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.accent,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  assignSection: {
    marginBottom: spacing.lg,
  },
  assignLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  searchInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  userList: {
    maxHeight: 180,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  userItemSelected: {
    borderWidth: 2,
    borderColor: colors.accent,
  },
  userItemText: {
    flex: 1,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  userItemEmail: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
  emptyListText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    padding: spacing.md,
    textAlign: 'center',
  },
  uploadModalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.accent,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
  },
  uploadModalButtonDisabled: {
    opacity: 0.7,
  },
  uploadModalButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalContent: {
    width: SCREEN_WIDTH,
    height: '100%',
    justifyContent: 'center',
  },
  modalImage: {
    width: SCREEN_WIDTH,
    height: 400,
  },
  closeImageButton: {
    position: 'absolute',
    top: 50,
    right: spacing.lg,
    padding: spacing.sm,
  },
});
