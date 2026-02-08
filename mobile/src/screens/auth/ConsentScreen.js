import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, borderRadius, typography } from '../../config/theme';

export default function ConsentScreen() {
  const { user, updateConsent, logout, isLoading } = useAuth();
  const [gdprConsent, setGdprConsent] = useState(user?.gdprConsent || false);
  const [locationConsent, setLocationConsent] = useState(user?.locationConsent || false);

  const handleAccept = async () => {
    if (!gdprConsent || !locationConsent) {
      Alert.alert(
        'Consentimiento requerido',
        'Para usar la aplicación de fichaje, debes aceptar ambos consentimientos.'
      );
      return;
    }

    const result = await updateConsent(gdprConsent, locationConsent);
    if (!result.success) {
      Alert.alert('Error', result.error || 'No se pudieron guardar los consentimientos');
    }
  };

  const handleReject = () => {
    Alert.alert(
      'Rechazar consentimientos',
      'Si no aceptas los consentimientos, no podrás usar la aplicación de fichaje. ¿Deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: logout },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="shield-checkmark" size={50} color={colors.primary} />
          </View>
          <Text style={styles.title}>Consentimientos legales</Text>
          <Text style={styles.subtitle}>
            Antes de usar la app, necesitamos tu autorización
          </Text>
        </View>

        {/* Consentimiento RGPD */}
        <View style={styles.consentCard}>
          <View style={styles.consentHeader}>
            <View style={styles.consentIcon}>
              <Ionicons name="document-text" size={24} color={colors.info} />
            </View>
            <View style={styles.consentTitleContainer}>
              <Text style={styles.consentTitle}>Tratamiento de datos (RGPD)</Text>
              <Text style={styles.consentRequired}>Obligatorio</Text>
            </View>
            <Switch
              value={gdprConsent}
              onValueChange={setGdprConsent}
              trackColor={{ false: colors.surfaceLight, true: colors.primaryLight }}
              thumbColor={gdprConsent ? colors.primary : colors.textMuted}
            />
          </View>
          <Text style={styles.consentText}>
            Autorizo el tratamiento de mis datos personales (nombre, DNI, email, registros de fichaje) 
            para la gestión del control horario laboral conforme al Reglamento General de Protección 
            de Datos (UE) 2016/679.
            {'\n\n'}
            <Text style={styles.consentHighlight}>Derechos:</Text> Acceso, rectificación, supresión, 
            portabilidad y oposición al tratamiento. Contacto: privacidad@soldeser.com
          </Text>
        </View>

        {/* Consentimiento Localización */}
        <View style={styles.consentCard}>
          <View style={styles.consentHeader}>
            <View style={[styles.consentIcon, { backgroundColor: colors.warning + '20' }]}>
              <Ionicons name="location" size={24} color={colors.warning} />
            </View>
            <View style={styles.consentTitleContainer}>
              <Text style={styles.consentTitle}>Uso de geolocalización</Text>
              <Text style={styles.consentRequired}>Obligatorio para fichar</Text>
            </View>
            <Switch
              value={locationConsent}
              onValueChange={setLocationConsent}
              trackColor={{ false: colors.surfaceLight, true: colors.primaryLight }}
              thumbColor={locationConsent ? colors.primary : colors.textMuted}
            />
          </View>
          <Text style={styles.consentText}>
            Autorizo el acceso a mi ubicación GPS únicamente en el momento del fichaje para 
            verificar mi presencia en la obra asignada.
            {'\n\n'}
            <Text style={styles.consentHighlight}>Nota:</Text> La ubicación solo se captura al 
            pulsar "Fichar entrada" o "Fichar salida". No hay seguimiento continuo.
          </Text>
        </View>

        {/* Info adicional */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.infoText}>
            Puedes revocar estos consentimientos en cualquier momento desde tu perfil. 
            Sin ellos no podrás usar la función de fichaje.
          </Text>
        </View>

        {/* Botones */}
        <View style={styles.buttons}>
          <TouchableOpacity
            style={[
              styles.acceptButton,
              (!gdprConsent || !locationConsent) && styles.buttonDisabled,
            ]}
            onPress={handleAccept}
            disabled={isLoading || !gdprConsent || !locationConsent}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={22} color={colors.text} />
                <Text style={styles.acceptButtonText}>Aceptar y continuar</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.rejectButton} onPress={handleReject}>
            <Text style={styles.rejectButtonText}>Rechazar y salir</Text>
          </TouchableOpacity>
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
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconContainer: {
    width: 90,
    height: 90,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  consentCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  consentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  consentIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.info + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  consentTitleContainer: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  consentTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  consentRequired: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
  },
  consentText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  consentHighlight: {
    color: colors.text,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  buttons: {
    gap: spacing.sm,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  buttonDisabled: {
    backgroundColor: colors.surfaceLight,
    opacity: 0.6,
  },
  acceptButtonText: {
    color: colors.text,
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
  },
  rejectButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  rejectButtonText: {
    color: colors.textMuted,
    fontSize: typography.fontSize.md,
  },
});
