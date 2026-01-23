import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../config/theme';
import { useAuth } from '../contexts/AuthContext';

import HomeScreen from '../screens/main/HomeScreen';
import HistoryScreen from '../screens/main/HistoryScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import AdminStack from './AdminStack';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERVISOR';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.backgroundSecondary,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 85,
          paddingBottom: 25,
          paddingTop: 10,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Fichaje') {
            iconName = focused ? 'time' : 'time-outline';
          } else if (route.name === 'Historial') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Perfil') {
            iconName = focused ? 'person' : 'person-outline';
          } else if (route.name === 'Admin') {
            iconName = focused ? 'shield-checkmark' : 'shield-checkmark-outline';
          }

          return <Ionicons name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen 
        name="Fichaje" 
        component={HomeScreen}
        options={{
          tabBarLabel: 'Fichar',
        }}
      />
      <Tab.Screen 
        name="Historial" 
        component={HistoryScreen}
      />
      {isAdmin && (
        <Tab.Screen 
          name="Admin" 
          component={AdminStack}
          options={{
            tabBarLabel: 'Panel',
            tabBarIcon: ({ focused, color }) => (
              <Ionicons 
                name={focused ? 'shield-checkmark' : 'shield-checkmark-outline'} 
                size={24} 
                color={color} 
              />
            ),
          }}
        />
      )}
      <Tab.Screen 
        name="Perfil" 
        component={ProfileScreen}
      />
    </Tab.Navigator>
  );
}
