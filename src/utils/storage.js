import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// SecureStore on the phone; localStorage when run in a browser (testing).
const web = Platform.OS === 'web';

export const secureGet = async (key) => (web ? globalThis.localStorage?.getItem(key) ?? null : SecureStore.getItemAsync(key));
export const secureSet = async (key, value) =>
  web ? globalThis.localStorage?.setItem(key, value) : SecureStore.setItemAsync(key, value);
export const secureDelete = async (key) => (web ? globalThis.localStorage?.removeItem(key) : SecureStore.deleteItemAsync(key));
