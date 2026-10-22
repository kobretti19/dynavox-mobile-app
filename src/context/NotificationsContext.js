import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { productionTasksAPI, pushTokensAPI } from '../api';
import { useAuth } from './AuthContext';
import { setPushToken } from '../utils/pushToken';

// In-app badge (polls the same endpoint as the web bell) + push
// notifications: the device's Expo push token is registered with the
// backend, which pushes new "To produce" notes and chat messages.

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const NotificationsContext = createContext({ unread: 0, latest: [], refresh: () => {} });

const POLL_MS = 30000;

const registerForPush = async () => {
  if (Platform.OS === 'web' || !Device.isDevice) return null;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#361826',
    });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    ({ status } = await Notifications.requestPermissionsAsync());
  }
  if (status !== 'granted') return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return null;
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return data;
};

// Where a tapped notification should lead.
const openFromData = (data) => {
  if (!data) return;
  if (data.taskId) router.push(`/tasks/${data.taskId}`);
  else if (data.repairId) router.push(`/repairs/${data.repairId}`);
};

export const NotificationsProvider = ({ children }) => {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);
  const [latest, setLatest] = useState([]);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const res = await productionTasksAPI.getNotifications();
      setUnread(res.data.data.unread);
      setLatest(res.data.data.latest);
      Notifications.setBadgeCountAsync(res.data.data.unread).catch(() => {});
    } catch {
      // offline -- keep the last value
    }
  }, [user]);

  // Poll while the app is in the foreground.
  useEffect(() => {
    if (!user) {
      setUnread(0);
      setLatest([]);
      return undefined;
    }
    refresh();
    let timer = setInterval(refresh, POLL_MS);
    const sub = AppState.addEventListener('change', (state) => {
      clearInterval(timer);
      if (state === 'active') {
        refresh();
        timer = setInterval(refresh, POLL_MS);
      }
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [user, refresh]);

  // Register this device for push once logged in (AuthContext unregisters
  // it on logout, while the session is still valid).
  useEffect(() => {
    if (!user) {
      Notifications.setBadgeCountAsync(0).catch(() => {});
      return;
    }
    registerForPush()
      .then((token) => {
        if (!token) return;
        setPushToken(token);
        return pushTokensAPI.register(token, Platform.OS);
      })
      .catch(() => {});
  }, [user]);

  // Push arrives while the app is open -> refresh the badge; tap -> open it.
  useEffect(() => {
    if (!user) return undefined;
    const received = Notifications.addNotificationReceivedListener(() => refresh());
    const tapped = Notifications.addNotificationResponseReceivedListener((response) => {
      openFromData(response.notification.request.content.data);
    });
    Notifications.getLastNotificationResponseAsync()
      .then((last) => {
        if (last) openFromData(last.notification.request.content.data);
      })
      .catch(() => {});
    return () => {
      received.remove();
      tapped.remove();
    };
  }, [user, refresh]);

  return <NotificationsContext.Provider value={{ unread, latest, refresh }}>{children}</NotificationsContext.Provider>;
};

export const useNotifications = () => useContext(NotificationsContext);
