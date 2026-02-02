import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, borderRadius, typography } from '../../config/theme';

export default function LoginScreen() {
  const { login, loginWithPin, isLoading, error } = useAuth();
  const [loginMode, setLoginMode] = useState('email'); // 'email' o 'pin'
  
  // Estado para login con email
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Estado para login con PIN
  const [dni, setDni] = useState('');
  const [pin, setPin] = useState('');

  const handleEmailLogin = async () => {
    Keyboard.dismiss();
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Por favor, introduce email y contraseña');
      return;
    }
    
    const result = await login(email.trim(), password);
    if (!result.success) {
      Alert.alert('Error', result.error);
    }
  };

  const handlePinLogin = async () => {
    Keyboard.dismiss();
    if (!dni.trim() || pin.length < 4) {
      Alert.alert('Error', 'Por favor, introduce DNI y PIN');
      return;
    }
    
    const result = await loginWithPin(dni.trim().toUpperCase(), pin);
    if (!result.success) {
      Alert.alert('Error', result.error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
          bounces={false}
        >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Ionicons name="construct" size={60} color={colors.primary} />
              </View>
              <Text style={styles.title}>SOLDESER</Text>
              <Text style={styles.subtitle}>Sistema de Fichaje</Text>
            </View>

            {/* Toggle Login Mode */}
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  loginMode === 'email' && styles.toggleButtonActive,
                ]}
                onPress={() => setLoginMode('email')}
              >
                <Ionicons 
                  name="mail-outline" 
                  size={18} 
                  color={loginMode === 'email' ? colors.background : colors.textSecondary} 
                />
                <Text style={[
                  styles.toggleText,
                  loginMode === 'email' && styles.toggleTextActive,
                ]}>
                  Email
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  loginMode === 'pin' && styles.toggleButtonActive,
                ]}
                onPress={() => setLoginMode('pin')}
              >
                <Ionicons 
                  name="keypad-outline" 
                  size={18} 
                  color={loginMode === 'pin' ? colors.background : colors.textSecondary} 
                />
                <Text style={[
                  styles.toggleText,
                  loginMode === 'pin' && styles.toggleTextActive,
                ]}>
                  PIN Rápido
                </Text>
              </TouchableOpacity>
            </View>

            {/* Formulario */}
            <View style={styles.form}>
              {loginMode === 'email' ? (
                <>
                  {/* Email Input */}
                  <View style={styles.inputContainer}>
                    <Ionicons name="mail-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Email"
                      placeholderTextColor={colors.textMuted}
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      textContentType="emailAddress"
                      returnKeyType="next"
                      blurOnSubmit={false}
                      editable={!isLoading}
                      selectTextOnFocus
                    />
                  </View>

                  {/* Password Input */}
                  <View style={styles.inputContainer}>
                    <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Contraseña"
                      placeholderTextColor={colors.textMuted}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      textContentType="password"
                      returnKeyType="done"
                      onSubmitEditing={handleEmailLogin}
                      editable={!isLoading}
                      selectTextOnFocus
                    />
                    <TouchableOpacity 
                      onPress={() => setShowPassword(!showPassword)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons 
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
                        size={20} 
                        color={colors.textMuted} 
                      />
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  {/* DNI Input */}
                  <View style={styles.inputContainer}>
                    <Ionicons name="card-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="DNI (ej: 12345678A)"
                      placeholderTextColor={colors.textMuted}
                      value={dni}
                      onChangeText={setDni}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      maxLength={9}
                      returnKeyType="next"
                      blurOnSubmit={false}
                      editable={!isLoading}
                      selectTextOnFocus
                    />
                  </View>

                  {/* PIN Input */}
                  <View style={styles.inputContainer}>
                    <Ionicons name="keypad-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="PIN (4-6 dígitos)"
                      placeholderTextColor={colors.textMuted}
                      value={pin}
                      onChangeText={setPin}
                      keyboardType="number-pad"
                      maxLength={6}
                      secureTextEntry
                      returnKeyType="done"
                      onSubmitEditing={handlePinLogin}
                      editable={!isLoading}
                      selectTextOnFocus
                    />
                  </View>
                </>
              )}

              {/* Error Message */}
              {error && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={18} color={colors.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Login Button */}
              <TouchableOpacity
                style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                onPress={loginMode === 'email' ? handleEmailLogin : handlePinLogin}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <>
                    <Ionicons name="log-in-outline" size={22} color={colors.background} />
                    <Text style={styles.loginButtonText}>Entrar</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Credenciales de prueba */}
              <View style={styles.helpBox}>
                <Text style={styles.helpTitle}>Credenciales de prueba:</Text>
                <Text style={styles.helpText}>admin@soldeser.com / admin123</Text>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                🏗️ Sistema de control horario
              </Text>
              <Text style={styles.footerSubtext}>
                Cumplimiento RGPD
              </Text>
            </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  title: {
    fontSize: typography.fontSize.xxl,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
    marginBottom: spacing.lg,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: colors.background,
  },
  form: {
    gap: spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 56,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: typography.fontSize.md,
    color: colors.text,
    paddingVertical: 0,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error + '20',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSize.sm,
    flex: 1,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    marginTop: spacing.sm,
    minHeight: 56,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: colors.background,
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
  },
  helpBox: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  helpTitle: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    marginBottom: 4,
  },
  helpText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
  },
  footerSubtext: {
    color: colors.textMuted,
    fontSize: typography.fontSize.xs,
    marginTop: spacing.xs,
  },
});
