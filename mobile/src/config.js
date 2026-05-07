import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra || {};

export const config = {
  backendUrl:
    process.env.EXPO_PUBLIC_BACKEND_URL ||
    extra.backendUrl ||
    "http://localhost:4000",
  auth0Domain:
    process.env.EXPO_PUBLIC_AUTH0_DOMAIN ||
    extra.auth0Domain ||
    "dev-i5331ndl5kxve1hd.us.auth0.com",
  auth0ClientId: process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID || "",
  auth0Audience:
    process.env.EXPO_PUBLIC_AUTH0_AUDIENCE ||
    process.env.EXPO_PUBLIC_BACKEND_URL ||
    extra.backendUrl ||
    "http://localhost:4000"
};

export const storageKeys = {
  accessToken: "cerbanimo.accessToken",
  user: "cerbanimo.user",
  profileSub: "cerbanimo.profileSub"
};
