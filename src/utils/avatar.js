export function getProfileImageUrl(profile, user) {
  const profilePicture = profile?.profile_picture;

  if (typeof profilePicture === "string" && profilePicture.trim()) {
    if (/^(https?:|data:|blob:)/i.test(profilePicture)) {
      return profilePicture;
    }

    const backendUrl = import.meta.env.VITE_BACKEND_URL || "";
    if (backendUrl) {
      const base = backendUrl.replace(/\/$/, "");
      const path = profilePicture.startsWith("/") ? profilePicture : `/${profilePicture}`;
      return `${base}${path}`;
    }

    return profilePicture;
  }

  return user?.picture || "/default-avatar.png";
}
