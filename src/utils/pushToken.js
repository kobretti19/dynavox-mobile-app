// This device's Expo push token, once registered with the backend.
let pushToken = null;
export const getPushToken = () => pushToken;
export const setPushToken = (token) => {
  pushToken = token;
};
