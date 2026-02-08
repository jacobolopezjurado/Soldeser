import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AdminDashboard from '../screens/admin/AdminDashboard';
import UsersManagement from '../screens/admin/UsersManagement';
import { colors } from '../config/theme';

const Stack = createNativeStackNavigator();

export default function AdminStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
      <Stack.Screen name="UsersManagement" component={UsersManagement} />
    </Stack.Navigator>
  );
}
