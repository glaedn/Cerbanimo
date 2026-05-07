import * as SecureStore from "expo-secure-store";

export async function getSecureItem(key) {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function setSecureItem(key, value) {
  if (value === null || value === undefined) {
    await SecureStore.deleteItemAsync(key);
    return;
  }
  await SecureStore.setItemAsync(key, String(value));
}

export async function getJsonItem(key) {
  const raw = await getSecureItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function setJsonItem(key, value) {
  await setSecureItem(key, JSON.stringify(value));
}
