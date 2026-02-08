import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  LayoutAnimation,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../config/api';
import { COLORS, FONTS, spacing } from '../../config/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function UsersManagement() {
  const navigation = useNavigation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    dni: '',
    phone: '',
    password: '',
    pin: '',
    role: 'WORKER',
  });

  const fetchUsers = useCallback(async () => {
    try {
      const response = await api.get('/users', { params: { limit: 100 } });
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      Alert.alert('Error', 'No se pudieron cargar los usuarios');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      dni: '',
      phone: '',
      password: '',
      pin: '',
      role: 'WORKER',
    });
    setModalVisible(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      dni: user.dni,
      phone: user.phone || '',
      password: '',
      pin: '',
      role: user.role,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    // Validación básica
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.dni) {
      Alert.alert('Error', 'Por favor completa todos los campos obligatorios');
      return;
    }

    if (!editingUser && !formData.password) {
      Alert.alert('Error', 'La contraseña es obligatoria para nuevos usuarios');
      return;
    }

    setSaving(true);

    try {
      // Preparar datos (no enviar campos vacíos)
      const dataToSend = { ...formData };
      if (!dataToSend.password) delete dataToSend.password;
      if (!dataToSend.pin) delete dataToSend.pin;
      if (!dataToSend.phone) delete dataToSend.phone;

      if (editingUser) {
        // Actualizar
        delete dataToSend.dni; // DNI no se puede modificar
        await api.put(`/users/${editingUser.id}`, dataToSend);
        Alert.alert('Éxito', 'Usuario actualizado correctamente');
      } else {
        // Crear
        await api.post('/users', dataToSend);
        Alert.alert('Éxito', 'Usuario creado correctamente');
      }

      setModalVisible(false);
      fetchUsers();
    } catch (error) {
      console.error('Error guardando usuario:', error);
      const message = error.response?.data?.error || 'No se pudo guardar el usuario';
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = (user) => {
    Alert.alert(
      'Eliminar usuario',
      `¿Eliminar permanentemente a ${user.firstName} ${user.lastName}? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            setDeletingId(user.id);
            slideAnim.setValue(0);
            Animated.timing(slideAnim, {
              toValue: 1,
              duration: 280,
              useNativeDriver: true,
            }).start(async ({ finished }) => {
              if (!finished) return;
              setDeletingId(null);
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setUsers((prev) => prev.filter((u) => u.id !== user.id));
              try {
                await api.delete(`/users/${user.id}`);
              } catch (error) {
                setUsers((prev) => [...prev, user]);
                Alert.alert('Error', error.response?.data?.error || 'No se pudo eliminar el usuario');
              }
            });
          },
        },
      ]
    );
  };

  const filteredUsers = users.filter(
    (user) =>
      user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.dni.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleLabel = (role) => {
    switch (role) {
      case 'ADMIN':
        return { label: 'Admin', color: '#EF4444' };
      case 'SUPERVISOR':
        return { label: 'Supervisor', color: '#F59E0B' };
      case 'WORKER':
        return { label: 'Trabajador', color: '#10B981' };
      default:
        return { label: role, color: '#6B7280' };
    }
  };

  const renderUserItem = ({ item }) => {
    const role = getRoleLabel(item.role);
    const isDeleting = item.id === deletingId;
    return (
      <Animated.View
        style={[
          styles.userCardWrapper,
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
        <TouchableOpacity
          style={styles.userCard}
          onPress={() => openEditModal(item)}
        >
          <View style={styles.userInfo}>
          <View style={styles.userHeader}>
            <Text style={styles.userName}>
              {item.firstName} {item.lastName}
            </Text>
            <View style={[styles.roleBadge, { backgroundColor: role.color }]}>
              <Text style={styles.roleText}>{role.label}</Text>
            </View>
          </View>
          <Text style={styles.userEmail}>{item.email}</Text>
          <Text style={styles.userDni}>DNI: {item.dni}</Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteUser(item)}
        >
          <Ionicons name="trash-outline" size={24} color={COLORS.error} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando usuarios...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header con búsqueda */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Gestión de Usuarios</Text>
        </View>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre, email o DNI..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Lista de usuarios */}
      <FlatList
        data={filteredUsers}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No hay usuarios</Text>
          </View>
        }
      />

      {/* Botón flotante para añadir */}
      <TouchableOpacity style={styles.fab} onPress={openCreateModal}>
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>

      {/* Modal de crear/editar */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={28} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Text style={styles.saveButton}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer}>
            <Text style={styles.label}>Nombre *</Text>
            <TextInput
              style={styles.input}
              value={formData.firstName}
              onChangeText={(text) => setFormData({ ...formData, firstName: text })}
              placeholder="Nombre"
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={styles.label}>Apellidos *</Text>
            <TextInput
              style={styles.input}
              value={formData.lastName}
              onChangeText={(text) => setFormData({ ...formData, lastName: text })}
              placeholder="Apellidos"
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              placeholder="email@ejemplo.com"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.label}>DNI *</Text>
            <TextInput
              style={[styles.input, editingUser && styles.inputDisabled]}
              value={formData.dni}
              onChangeText={(text) => setFormData({ ...formData, dni: text.toUpperCase() })}
              placeholder="12345678A"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="characters"
              editable={!editingUser}
            />

            <Text style={styles.label}>Teléfono</Text>
            <TextInput
              style={styles.input}
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              placeholder="612345678"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>
              Contraseña {editingUser ? '(dejar vacío para no cambiar)' : '*'}
            </Text>
            <TextInput
              style={styles.input}
              value={formData.password}
              onChangeText={(text) => setFormData({ ...formData, password: text })}
              placeholder="Mínimo 8 caracteres"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry
            />

            <Text style={styles.label}>PIN (para fichaje rápido)</Text>
            <TextInput
              style={styles.input}
              value={formData.pin}
              onChangeText={(text) => setFormData({ ...formData, pin: text })}
              placeholder="4-6 dígitos"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              maxLength={6}
            />

            <Text style={styles.label}>Rol *</Text>
            <View style={styles.roleSelector}>
              {['WORKER', 'SUPERVISOR', 'ADMIN'].map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.roleOption,
                    formData.role === role && styles.roleOptionSelected,
                  ]}
                  onPress={() => setFormData({ ...formData, role })}
                >
                  <Text
                    style={[
                      styles.roleOptionText,
                      formData.role === role && styles.roleOptionTextSelected,
                    ]}
                  >
                    {getRoleLabel(role).label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ height: 50 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  backBtn: {
    padding: 4,
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.text,
  },
  listContent: {
    padding: 15,
    paddingBottom: 100,
  },
  userCardWrapper: {},
  userCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  userCardInactive: {
    opacity: 0.6,
    backgroundColor: COLORS.background,
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 17,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
    marginRight: 10,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    color: 'white',
  },
  userEmail: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
  },
  userDni: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  inactiveLabel: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: COLORS.error,
    marginTop: 4,
  },
  deleteButton: {
    padding: spacing.sm,
    justifyContent: 'center',
  },
  toggleButton: {
    padding: 5,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
  },
  saveButton: {
    fontSize: 17,
    fontFamily: FONTS.semiBold,
    color: COLORS.primary,
  },
  formContainer: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputDisabled: {
    backgroundColor: COLORS.background,
    color: COLORS.textMuted,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 10,
  },
  roleOption: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  roleOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '15',
  },
  roleOptionText: {
    fontFamily: FONTS.semiBold,
    color: COLORS.textMuted,
  },
  roleOptionTextSelected: {
    color: COLORS.primary,
  },
});
