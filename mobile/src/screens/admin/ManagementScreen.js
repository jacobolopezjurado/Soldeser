import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, borderRadius, typography } from '../../config/theme';

const MenuCard = ({ icon, title, desc, onPress, color = colors.accent }) => (
  <TouchableOpacity style={styles.menuCard} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.menuIcon, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon} size={28} color={color} />
    </View>
    <View style={styles.menuContent}>
      <Text style={styles.menuTitle}>{title}</Text>
      <Text style={styles.menuDesc}>{desc}</Text>
    </View>
    <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
  </TouchableOpacity>
);

export default function ManagementScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Gestión</Text>
        <Text style={styles.subtitle}>Usuarios, obras y formación</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <MenuCard
          icon="people"
          title="Gestión de usuarios"
          desc="Crear, borrar y asignar usuarios a obras"
          onPress={() => navigation.navigate('UsersManagement')}
        />
        <MenuCard
          icon="business"
          title="Gestión de obras"
          desc="Crear obras y ubicarlas en el mapa"
          onPress={() => navigation.navigate('WorksitesManagement')}
          color={colors.info}
        />
        <MenuCard
          icon="school"
          title="Cursos y formación"
          desc="Cursos (gruista, carnet…), EPIs y revisión médica"
          onPress={() => navigation.navigate('WorkerTrainingScreen')}
          color={colors.success}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: typography.fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  content: {
    padding: spacing.lg,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  menuIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  menuDesc: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
