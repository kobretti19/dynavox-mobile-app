import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { LanguageProvider, useLanguage } from '../context/LanguageContext';
import { NotificationsProvider } from '../context/NotificationsContext';
import { Loading } from '../components/ui';
import { colors } from '../theme';
import { setFormatLocale } from '../utils/format';

const RootStack = () => {
  const { isAuthenticated, loading } = useAuth();
  const { t, language } = useLanguage();

  useEffect(() => {
    setFormatLocale(language);
  }, [language]);

  if (loading) return <Loading />;

  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.brand,
        headerTitleStyle: { color: colors.text },
        headerBackTitle: t('common.back'),
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name='login' options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name='(drawer)' options={{ headerShown: false }} />
        <Stack.Screen name='scan' options={{ title: t('mobile.scan'), presentation: 'fullScreenModal', headerShown: false }} />
        {/* Titles shown until each detail screen sets its own. */}
        <Stack.Screen name='parts/[id]' options={{ title: t('nav.parts') }} />
        <Stack.Screen name='repairs/[id]' options={{ title: t('nav.repairs') }} />
        <Stack.Screen name='orders/[id]' options={{ title: t('nav.orders') }} />
        <Stack.Screen name='orders/report' options={{ title: t('orderPartsReport.title') }} />
        <Stack.Screen name='equipment/[id]' options={{ title: t('nav.equipment') }} />
        <Stack.Screen name='equipment/report' options={{ title: t('equipmentReport.title') }} />
        <Stack.Screen name='templates/[id]' options={{ title: t('nav.templates') }} />
        <Stack.Screen name='customers/[id]' options={{ title: t('nav.customers') }} />
        <Stack.Screen name='dealers/[id]' options={{ title: t('nav.dealers') }} />
        <Stack.Screen name='devices/[id]' options={{ title: t('nav.devices') }} />
        <Stack.Screen name='tasks/[id]' options={{ title: t('productionTasks.comments') }} />
        <Stack.Screen name='notifications' options={{ title: t('mobile.notifications') }} />
        <Stack.Screen name='holidays' options={{ title: t('vacations.holidays') }} />
        <Stack.Screen name='vacation-stats/[userId]' options={{ title: t('nav.vacations') }} />
      </Stack.Protected>
    </Stack>
  );
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LanguageProvider>
          <AuthProvider>
            <NotificationsProvider>
              <StatusBar style='dark' />
              <RootStack />
            </NotificationsProvider>
          </AuthProvider>
        </LanguageProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
