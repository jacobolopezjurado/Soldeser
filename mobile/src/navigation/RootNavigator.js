import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../config/theme';

// Pantallas de Auth
import LoginScreen from '../screens/auth/LoginScreen';
import ConsentScreen from '../screens/auth/ConsentScreen';

// Pantallas principales
import MainTabs from './MainTabs';

const Stack = createNativeStackNavigator();

const LoadingScreen = () => (
  <View style={{ 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: colors.background 
  }}>
    <ActivityIndicator size="large" color={colors.primary} />
  </View>
);

export default function RootNavigator() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
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
