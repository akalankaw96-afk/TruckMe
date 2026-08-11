import React, { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View, Text } from 'react-native';

import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import JobDetailScreen from './screens/JobDetailScreen';
import DriverProfileScreen from './screens/DriverProfileScreen';
import EarningsScreen from './screens/EarningsScreen';
import DriverVehicleScreen from './screens/DriverVehicleScreen';
import ReturnLoadsScreen from './screens/ReturnLoadsScreen';
import SubscriptionScreen from './screens/SubscriptionScreen';
import { getStoredToken, getStoredUser } from './api/client';
import { DriverProfile, DriverUser, Vehicle } from './types';

const Stack = createNativeStackNavigator();

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: '#F4F7FB', primary: '#1A2B4A' },
};

export default function App() {
  const [user, setUser] = useState<DriverUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);

  const registerPushToken = async (driverId: string, userId: string) => {
    try {
      const demoToken = `ExponentPushToken[driver_${driverId.substring(0, 8)}]`;
      await client.post('/api/notifications/register-token', {
        driverId: driverId,
        userId: userId,
        pushToken: demoToken,
      });
      console.log('[Push] Registered token for driver:', driverId);
    } catch (e) {
      console.warn('[Push] Registration error:', e);
    }
  };

  useEffect(() => {
    (async () => {
      const token = await getStoredToken();
      const cached = await getStoredUser();
      if (token && cached && cached.role === 'Driver') {
        setUser(cached);
        registerPushToken(cached.id, cached.id);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1A2B4A' }}>
        <ActivityIndicator color="#F5A623" size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={theme}>
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: '#1A2B4A' },
            headerTintColor: 'white',
            headerTitleStyle: { fontWeight: '700' },
          }}>
          {user ? (
            <>
              <Stack.Screen name="Dashboard" options={{ title: 'TruckMe Driver' }}>
                {(props) => (
                  <DashboardScreen
                    {...props}
                    user={user}
                    onLogout={() => setUser(null)}
                    onSelectJob={(id: string) => props.navigation.navigate('JobDetail', { jobId: id })}
                    onOpenProfile={() => props.navigation.navigate('DriverProfile')}
                    onOpenSubscriptions={() => props.navigation.navigate('Subscriptions')}
                    onOpenEarnings={() => props.navigation.navigate('Earnings')}
                  />
                )}
              </Stack.Screen>

              <Stack.Screen name="Subscriptions" options={{ title: '0% Commission Passes' }}>
                {(props) => (
                  <SubscriptionScreen
                    {...props}
                    user={user!}
                    onBack={() => props.navigation.goBack()}
                  />
                )}
              </Stack.Screen>

              <Stack.Screen name="JobDetail" options={{ title: 'Job Details' }}>
                {(props) => {
                  const params = props.route.params as any;

                  const currentDriver = driver || {
                    id: user?.id || '00000000-0000-0000-0000-000000000000',
                    userId: user?.id || '00000000-0000-0000-0000-000000000000',
                    isOnline: true,
                    isAvailable: true,
                    averageRating: 4.9,
                    totalTrips: 18,
                    totalEarnings: 84500,
                  };

                  const currentVehicle = vehicle || {
                    id: '00000000-0000-0000-0000-000000000000',
                    driverId: currentDriver.id,
                    plateNumber: 'WP-CAB-1234',
                    vehicleType: '1-Ton Truck',
                    capacityKg: 1000,
                    approvalStatus: 'Approved',
                  };

                  return (
                    <JobDetailScreen
                      {...props}
                      user={user!}
                      driver={currentDriver as any}
                      vehicle={currentVehicle as any}
                      jobId={params?.jobId}
                      onAccepted={() => props.navigation.navigate('Dashboard')}
                      onBack={() => props.navigation.goBack()}
                    />
                  );
                }}
              </Stack.Screen>

              <Stack.Screen name="DriverProfile" options={{ title: 'Profile' }}>
                {(props) => (
                  <DriverProfileScreen
                    {...props}
                    onBack={() => props.navigation.goBack()}
                    onOpenEarnings={() => props.navigation.navigate('Earnings')}
                    onOpenVehicle={() => props.navigation.navigate('DriverVehicle')}
                    onLogout={() => setUser(null)}
                  />
                )}
              </Stack.Screen>

              <Stack.Screen name="Earnings" options={{ title: 'Earnings' }}>
                {(props) => (
                  <EarningsScreen
                    {...props}
                    onBack={() => props.navigation.goBack()}
                  />
                )}
              </Stack.Screen>

              <Stack.Screen name="DriverVehicle" options={{ title: 'My Vehicle' }}>
                {(props) => (
                  <DriverVehicleScreen
                    {...props}
                    onBack={() => props.navigation.goBack()}
                  />
                )}
              </Stack.Screen>

              <Stack.Screen name="ReturnLoads" options={{ title: 'Backhaul Return Loads' }}>
                {(props) => (
                  <ReturnLoadsScreen
                    {...props}
                    onBack={() => props.navigation.goBack()}
                  />
                )}
              </Stack.Screen>
            </>
          ) : (
            <Stack.Screen name="Login" options={{ headerShown: false }}>
              {(props) => <LoginScreen {...props} onLogin={setUser} />}
            </Stack.Screen>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
