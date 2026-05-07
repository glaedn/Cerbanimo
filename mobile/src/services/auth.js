import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { config } from "../config";

WebBrowser.maybeCompleteAuthSession();

export function useAuth0Request() {
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: "cerbanimo",
    path: ""
  });

  const discovery = {
    authorizationEndpoint: `https://${config.auth0Domain}/authorize`,
    tokenEndpoint: `https://${config.auth0Domain}/oauth/token`,
    revocationEndpoint: `https://${config.auth0Domain}/oauth/revoke`
  };

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: config.auth0ClientId,
      redirectUri,
      scopes: ["openid", "profile", "email"],
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
      extraParams: {
        audience: config.auth0Audience
      }
    },
    discovery
  );

  async function exchangeAsync(code) {
    if (!request?.codeVerifier) throw new Error("Auth request is not ready");
    return AuthSession.exchangeCodeAsync(
      {
        clientId: config.auth0ClientId,
        code,
        redirectUri,
        extraParams: {
          code_verifier: request.codeVerifier
        }
      },
      discovery
    );
  }

  return {
    request,
    response,
    promptAsync,
    exchangeAsync,
    redirectUri,
    configured: Boolean(config.auth0ClientId)
  };
}

export async function fetchUserInfo(accessToken) {
  const response = await fetch(`https://${config.auth0Domain}/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) throw new Error("Unable to load Auth0 user info");
  return response.json();
}

export function decodeJwtPayload(token) {
  if (!token) return null;
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = globalThis.atob
      ? globalThis.atob(normalized)
      : Buffer.from(normalized, "base64").toString("utf8");
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}
