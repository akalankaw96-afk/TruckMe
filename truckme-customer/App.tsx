import React, { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View, Text } from 'react-native';

import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import AddressesScreen from './screens/AddressesScreen';
import BookScreen from './screens/BookScreen';
import MyBookingsScreen from './screens/MyBookingsScreen';
import BookingDetailScreen from './screens/BookingDetailScreen';
import RatingScreen from './screens/RatingScreen';
import PaymentScreen from './screens/PaymentScreen';
import { getStoredToken, getStoredUser } from './api/client';
import { AuthUser, VehicleType } from './types';

const Stack = createNativeStackNavigator();

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: '#F4F7FB', primary: '#1A2B4A' },
};

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBooking] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      const token = await getStoredToken();
      const cached = await getStoredUser();
      if (token && cached) setUser(cached);
      setLoading(false);
    })();
  }, []);

  const handleLogin = (u: AuthUser) => setUser(u);
  const handleLogout = () => setUser(null);

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
              <Stack.Screen name="Home" options={{ title: 'TruckMe' }}>
                {(props) => (
                  <HomeScreen
                    {...props}
                    user={user}
                    onLogout={handleLogout}
                    onOpenAddresses={() => props.navigation.navigate('Addresses')}
                    onOpenBookings={() => props.navigation.navigate('MyBookings')}
                    onSelectTruck={(vt: VehicleType) => {
                      console.log("Selected truck:", vt);
                      props.navigation.navigate("Book", { truck: vt });
                    }}
                  />
                )}
              </Stack.Screen>

              <Stack.Screen name="Addresses" options={{ title: 'Saved Addresses' }}>
                {(props) => <AddressesScreen {...props} userId={user.id} />}
              </Stack.Screen>
              
              <Stack.Screen
                name="Book"
                options={{ title: "Book" }}
              >
                {(props) => {
                  console.log("Route params:", props.route.params);

                  const truck = (props.route.params as any)?.truck;

                  if (!truck) {
                    return (
                      <View style={{flex:1,justifyContent:'center',alignItems:'center'}}>
                        <Text>No truck selected</Text>
                      </View>
                    );
                  }

                  return (
                    <BookScreen
                      {...props}
                      user={user}
                      vehicle={truck}
                      onBack={() => props.navigation.goBack()}
                      onBooked={() => props.navigation.navigate("MyBookings")}
                    />
                  );
                }}
              </Stack.Screen>

              <Stack.Screen name="MyBookings" options={{ title: 'My Bookings' }}>
                {(props) => (
                  <MyBookingsScreen {...props} />
                )}
              </Stack.Screen>

              <Stack.Screen
                name="BookingDetail"
                options={{ title: 'Booking Details' }}
                initialParams={{ bookingId: '' }}>
                {(props) => {
                  const params = props.route.params as any;
                  const bookingId = params?.bookingId;
                  if (!bookingId) {
                    return (
                      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F7FB' }}>
                        <Text style={{ color: '#5A6B85' }}>No booking selected</Text>
                      </View>
                    );
                  }
                  return (
                    <BookingDetailScreen
                      {...props}
                      user={user}
                      bookingId={bookingId}
                      onBack={() => props.navigation.goBack()}
                      onRate={(id: string) => props.navigation.navigate('Rating', { bookingId: id })}
                      onPay={(id: string, amt: number) => props.navigation.navigate('Payment', { bookingId: id, amount: amt })}
                    />
                  );
                }}
              </Stack.Screen>

              <Stack.Screen name="Rating" options={{ title: 'Rate Experience' }}>
                {(props) => {
                  const routeParams = props.route.params as any;
                  const bookingId = routeParams?.bookingId;
                  if (!bookingId) {
                    return (
                      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#5A6B85' }}>No booking selected</Text>
                      </View>
                    );
                  }
                  return (
                    <RatingScreen
                      {...props}
                      userId={user.id}
                      bookingId={bookingId}
                      onBack={() => props.navigation.goBack()}
                      onRated={() => props.navigation.navigate('MyBookings')}
                    />
                  );
                }}
              </Stack.Screen>

              <Stack.Screen name="Payment" options={{ title: 'Payment' }}>
                {(props) => {
                  const routeParams = props.route.params as any;
                  const bookingId = routeParams?.bookingId;
                  const amount = routeParams?.amount ?? 0;
                  if (!bookingId) {
                    return (
                      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#5A6B85' }}>No booking selected</Text>
                      </View>
                    );
                  }
                  return (
                    <PaymentScreen
                      {...props}
                      user={user}
                      bookingId={bookingId}
                      amount={amount}
                      onBack={() => props.navigation.goBack()}
                      onPaid={() => props.navigation.navigate('MyBookings')}
                    />
                  );
                }}
              </Stack.Screen>
            </>
          ) : (
            <Stack.Screen name="Login" options={{ headerShown: false }}>
              {(props) => <LoginScreen {...props} onLogin={handleLogin} />}
            </Stack.Screen>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
