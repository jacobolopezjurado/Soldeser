import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, borderRadius, typography } from '../../config/theme';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: logout },
      ]
    );
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'ADMIN': return 'Administrador';
      case 'SUPERVISOR': return 'Supervisor';
      case 'WORKER': return 'Trabajador';
      default: return role;
    }
  };

  const MenuItem = ({ icon, label, value, onPress, showArrow = true, danger = false }) => (
    <TouchableOpacity 
      style={styles.menuItem} 
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.menuIcon, danger && styles.menuIconDanger]}>
        <Ionicons name={icon} size={20} color={danger ? colors.error : colors.textSecondary} />
      </View>
      <View style={styles.menuContent}>
        <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>{label}</Text>
        {value && <Text style={styles.menuValue}>{value}</Text>}
      </View>
      {showArrow && onPress && (
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Perfil</Text>
        </View>

        {/* User Info */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.firstName} {user?.lastName}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{getRoleLabel(user?.role)}</Text>
            </View>
          </View>
        </View>

        {/* Cuenta */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cuenta</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon="log-out-outline"
              label="Cerrar sesión"
              onPress={handleLogout}
              showArrow={false}
              danger
            />
          </View>
        </View>

        {/* Version */}
        <View style={styles.version}>
          <Text style={styles.versionText}>Soldeser Fichaje v1.0.0</Text>
          <Text style={styles.versionSubtext}>© 2024 Soldeser Construcción</Text>
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
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  userInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  userName: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  userEmail: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  roleBadge: {
    backgroundColor: colors.accent + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  roleText: {
    fontSize: typography.fontSize.xs,
    color: colors.accent,
    fontWeight: '600',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIconDanger: {
    backgroundColor: colors.error + '20',
  },
  menuContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  menuLabel: {
    fontSize: typography.fontSize.md,
    color: colors.text,
  },
  menuLabelDanger: {
    color: colors.error,
  },
  menuValue: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 60,
  },
  version: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  versionText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  versionSubtext: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
