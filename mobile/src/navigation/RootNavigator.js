import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../config/theme';

// Pantallas de Auth
import LoginScreen from '../screens/auth/LoginScreen';
import ConsentScreen from '../screens/auth/ConsentScreen';

// Pantallas principales
import MainTabs from './MainTabs';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Ocultar splash nativo cuando Auth esté listo (evita doble logo)
  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  if (isLoading) {
    return <View style={styles.splash} />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'fade',
      }}
    >
      {!isAuthenticated ? (
        // Pantallas de autenticación
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : !user?.gdprConsent || !user?.locationConsent ? (
        // Pantalla de consentimiento RGPD
        <Stack.Screen name="Consent" component={ConsentScreen} />
      ) : (
        // App principal
        <Stack.Screen name="Main" component={MainTabs} />
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
