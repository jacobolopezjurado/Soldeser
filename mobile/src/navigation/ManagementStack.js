import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ManagementScreen from '../screens/admin/ManagementScreen';
import UsersManagement from '../screens/admin/UsersManagement';
import WorksitesManagement from '../screens/admin/WorksitesManagement';
import WorkerTrainingScreen from '../screens/admin/WorkerTrainingScreen';
import { colors } from '../config/theme';

const Stack = createNativeStackNavigator();

export default function ManagementStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="ManagementScreen" component={ManagementScreen} />
      <Stack.Screen name="UsersManagement" component={UsersManagement} />
      <Stack.Screen name="WorksitesManagement" component={WorksitesManagement} />
      <Stack.Screen name="WorkerTrainingScreen" component={WorkerTrainingScreen} />
    </Stack.Navigator>
  );
}
