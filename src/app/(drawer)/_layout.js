import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Drawer, DrawerContentScrollView, DrawerItem } from 'expo-router/drawer';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useNotifications } from '../../context/NotificationsContext';
import { Segmented, confirm } from '../../components/ui';
import { colors } from '../../theme';

// Same order as the web sidebar.
export const menuItems = (t, isAdmin) => [
  { name: 'index', href: '/', label: t('nav.dashboard'), icon: '📊' },
  { name: 'equipment', href: '/equipment', label: t('nav.equipment'), icon: '🔧' },
  { name: 'orders', href: '/orders', label: t('nav.orders'), icon: '🛒' },
  { name: 'parts', href: '/parts', label: t('nav.parts'), icon: '⚙️' },
  { name: 'stock-movements', href: '/stock-movements', label: t('nav.stockMovements'), icon: '📈' },
  { name: 'equipment-templates', href: '/equipment-templates', label: t('nav.templates'), icon: '📋' },
  { name: 'component-stock', href: '/component-stock', label: t('nav.componentStock'), icon: '🧩' },
  { name: 'production-tasks', href: '/production-tasks', label: t('nav.productionTasks'), icon: '📝' },
  { name: 'repairs', href: '/repairs', label: t('nav.repairs'), icon: '🩹' },
  { name: 'customers', href: '/customers', label: t('nav.customers'), icon: '🧑' },
  { name: 'dealers', href: '/dealers', label: t('nav.dealers'), icon: '🏬' },
  { name: 'devices', href: '/devices', label: t('nav.devices'), icon: '🔩' },
  ...(isAdmin ? [{ name: 'users', href: '/users', label: t('nav.users'), icon: '👤' }] : []),
  { name: 'vacations', href: '/vacations', label: t('nav.vacations'), icon: '🏖️' },
  { name: 'settings', href: '/settings', label: t('mobile.settings'), icon: '⚙︎' },
];

const HeaderRight = () => {
  const { unread } = useNotifications();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18, marginRight: 16 }}>
      <Pressable onPress={() => router.push('/scan')} hitSlop={10}>
        <Text style={{ fontSize: 20 }}>📷</Text>
      </Pressable>
      <Pressable onPress={() => router.push('/notifications')} hitSlop={10}>
        <Text style={{ fontSize: 20 }}>🔔</Text>
        {unread > 0 ? (
          <View
            style={{
              position: 'absolute',
              top: -6,
              right: -10,
              backgroundColor: colors.red,
              borderRadius: 9,
              minWidth: 18,
              height: 18,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 4,
            }}
          >
            <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>{unread > 99 ? '99+' : unread}</Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
};

const DrawerContent = (props) => {
  const { user, isAdmin, logout } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const items = menuItems(t, isAdmin);

  return (
    <View style={{ flex: 1 }}>
      <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: insets.top + 8 }}>
        <View style={{ paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 8 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.brand }}>DYNAVOX</Text>
          <Text style={{ fontSize: 14, color: colors.text, marginTop: 6, fontWeight: '600' }}>{user?.full_name || user?.loginName}</Text>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>{user?.userType}</Text>
        </View>
        {items.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <DrawerItem
              key={item.name}
              label={`${item.icon}  ${item.label}`}
              focused={active}
              activeTintColor={colors.brand}
              activeBackgroundColor={colors.brandLight}
              inactiveTintColor={colors.gray}
              labelStyle={{ fontSize: 15, fontWeight: active ? '700' : '500' }}
              onPress={() => router.navigate(item.href)}
            />
          );
        })}
      </DrawerContentScrollView>
      <View style={{ padding: 16, paddingBottom: insets.bottom + 16, borderTopWidth: 1, borderTopColor: colors.border, gap: 12 }}>
        <Segmented
          options={[
            { value: 'en', label: 'English' },
            { value: 'de', label: 'Deutsch' },
          ]}
          value={language}
          onChange={setLanguage}
        />
        <Pressable
          onPress={async () => {
            if (await confirm(t('mobile.logout'), t('mobile.confirmLogout'), { confirmText: t('mobile.logout'), cancelText: t('common.cancel') })) {
              logout();
            }
          }}
        >
          <Text style={{ color: colors.red, fontWeight: '600', fontSize: 15 }}>⎋  {t('mobile.logout')}</Text>
        </Pressable>
      </View>
    </View>
  );
};

export default function DrawerLayout() {
  const { t } = useLanguage();
  // Every screen is declared (users too, even for non-admins -- the custom
  // drawer content only lists it for admins and the backend guards it).
  const items = menuItems(t, true);

  return (
    <Drawer
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerTintColor: colors.brand,
        headerTitleStyle: { color: colors.text, fontWeight: '700' },
        headerRight: () => <HeaderRight />,
        sceneStyle: { backgroundColor: colors.bg },
        drawerStyle: { width: 290 },
      }}
    >
      {items.map((item) => (
        <Drawer.Screen key={item.name} name={item.name} options={{ title: item.label }} />
      ))}
    </Drawer>
  );
}
