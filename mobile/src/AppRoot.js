import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Platform, StatusBar, StyleSheet, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useAuth0Request, fetchUserInfo, decodeJwtPayload } from "./services/auth";
import { createApi } from "./services/api";
import { getJsonItem, getSecureItem, setJsonItem, setSecureItem } from "./services/storage";
import { storageKeys } from "./config";
import { BottomTabs } from "./components/BottomTabs";
import { LoadingState } from "./components/AppShell";
import { TopControls } from "./components/TopControls";
import { DashboardScreen } from "./screens/DashboardScreen";
import { TasksScreen } from "./screens/TasksScreen";
import { ProjectsScreen } from "./screens/ProjectsScreen";
import { ExchangeScreen } from "./screens/ExchangeScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { SignInScreen } from "./screens/SignInScreen";
import { NotificationsScreen } from "./screens/NotificationsScreen";
import { colors } from "./theme";

const AppContext = createContext(null);

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp must be used inside AppRoot");
  return value;
}

function AppFrame() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const app = useApp();

  if (!app.ready) {
    return <LoadingState label="Preparing native console" />;
  }

  if (!app.accessToken) {
    return <SignInScreen />;
  }

  const screen = {
    dashboard: <DashboardScreen />,
    tasks: <TasksScreen />,
    projects: <ProjectsScreen />,
    exchange: <ExchangeScreen />,
    profile: <ProfileScreen />,
    notifications: <NotificationsScreen />
  }[activeTab] || <DashboardScreen />;

  return (
    <View style={styles.frame}>
      <TopControls
        profile={app.profile}
        authUser={app.authUser}
        unreadCount={app.unreadCount}
        onProfile={() => setActiveTab("profile")}
        onNotifications={() => setActiveTab("notifications")}
      />
      {screen}
      <BottomTabs active={activeTab} onChange={setActiveTab} unreadCount={app.unreadCount} />
    </View>
  );
}

export function AppRoot() {
  const auth = useAuth0Request();
  const [ready, setReady] = useState(false);
  const [accessToken, setAccessToken] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [profileSub, setProfileSub] = useState("");
  const [profile, setProfile] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [bootError, setBootError] = useState("");
  const processedAuthCode = useRef(null);

  const api = useMemo(() => createApi(async () => accessToken), [accessToken]);

  const loadProfile = useCallback(async (subOverride, tokenOverride) => {
    const sub = subOverride || profileSub || authUser?.sub;
    if (!sub) return null;
    const profileApi = tokenOverride ? createApi(async () => tokenOverride) : api;
    const next = await profileApi.get("/profile", { sub });
    setProfile(next);
    return next;
  }, [api, authUser?.sub, profileSub]);

  const saveSession = useCallback(async ({ token, user, sub }) => {
    setAccessToken(token);
    setAuthUser(user || null);
    setProfileSub(sub || user?.sub || "");
    await setSecureItem(storageKeys.accessToken, token);
    await setJsonItem(storageKeys.user, user || null);
    await setSecureItem(storageKeys.profileSub, sub || user?.sub || "");
  }, []);

  const signInWithAuth0 = useCallback(async () => {
    if (!auth.configured) {
      Alert.alert("Auth0 is not configured", "Set EXPO_PUBLIC_AUTH0_CLIENT_ID in mobile/.env, then restart Expo.");
      return;
    }
    await auth.promptAsync();
  }, [auth]);

  const signInWithToken = useCallback(async ({ token, sub }) => {
    if (!token) {
      Alert.alert("Missing token", "Paste a backend-ready Auth0 access token.");
      return;
    }
    await saveSession({ token, user: sub ? { sub } : null, sub });
    try {
      await loadProfile(sub, token);
    } catch (error) {
      setBootError(error.message);
    }
  }, [loadProfile, saveSession]);

  const signOut = useCallback(async () => {
    setAccessToken(null);
    setAuthUser(null);
    setProfileSub("");
    setProfile(null);
    setNotifications([]);
    await setSecureItem(storageKeys.accessToken, null);
    await setSecureItem(storageKeys.profileSub, null);
    await setJsonItem(storageKeys.user, null);
  }, []);

  const refreshNotifications = useCallback(async () => {
    if (!profile?.id) return [];
    setNotificationsLoading(true);
    try {
      const data = await api.get(`/notifications/${profile.id}`);
      const rows = Array.isArray(data?.notifications) ? data.notifications : [];
      setNotifications(rows);
      return rows;
    } catch (error) {
      setBootError(error.message);
      return [];
    } finally {
      setNotificationsLoading(false);
    }
  }, [api, profile?.id]);

  const markNotificationsRead = useCallback(async (notificationIds = []) => {
    if (!notificationIds.length) return;
    const ids = notificationIds.map((id) => id.toString());
    try {
      await api.post("/notifications/read", { notificationIds: ids });
      setNotifications((items) => items.map((item) => (
        ids.includes(item.id?.toString()) ? { ...item, read: true } : item
      )));
    } catch (error) {
      Alert.alert("Unable to mark notifications read", error.message);
    }
  }, [api]);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      try {
        const [token, user, sub] = await Promise.all([
          getSecureItem(storageKeys.accessToken),
          getJsonItem(storageKeys.user),
          getSecureItem(storageKeys.profileSub)
        ]);
        if (cancelled) return;
        setAccessToken(token);
        setAuthUser(user);
        setProfileSub(sub || user?.sub || "");
      } catch (error) {
        setBootError(error.message);
      } finally {
        if (!cancelled) setReady(true);
      }
    }
    boot();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!accessToken || !ready) return;
    loadProfile().catch((error) => setBootError(error.message));
  }, [accessToken, loadProfile, ready]);

  useEffect(() => {
    if (!profile?.id) return;
    refreshNotifications();
  }, [profile?.id, refreshNotifications]);

  useEffect(() => {
    async function completeAuth() {
      if (auth.response?.type !== "success") return;
      const code = auth.response.params.code;
      if (!code || processedAuthCode.current === code) return;
      processedAuthCode.current = code;
      try {
        const tokenResponse = await auth.exchangeAsync(code);
        const token = tokenResponse.accessToken;
        const user = tokenResponse.idToken
          ? decodeJwtPayload(tokenResponse.idToken)
          : await fetchUserInfo(token);
        await saveSession({ token, user, sub: user.sub });
      } catch (error) {
        Alert.alert("Sign in failed", error.message);
      }
    }
    completeAuth();
  }, [auth, saveSession]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  );

  const value = useMemo(() => ({
    api,
    authUser,
    accessToken,
    bootError,
    ready,
    profile,
    profileSub,
    notifications,
    unreadCount,
    notificationsLoading,
    refreshNotifications,
    markNotificationsRead,
    refreshProfile: loadProfile,
    signInWithAuth0,
    signInWithToken,
    signOut
  }), [
    accessToken,
    api,
    authUser,
    bootError,
    loadProfile,
    markNotificationsRead,
    notifications,
    notificationsLoading,
    profile,
    profileSub,
    ready,
    refreshNotifications,
    signInWithAuth0,
    signInWithToken,
    signOut,
    unreadCount
  ]);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <AppContext.Provider value={value}>
          <AppFrame />
        </AppContext.Provider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0
  },
  frame: {
    flex: 1
  }
});
