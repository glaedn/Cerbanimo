import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const bridgeMessageTypes = {
  success: 'CERBANIMO_AUTH_BRIDGE_SUCCESS',
  error: 'CERBANIMO_AUTH_BRIDGE_ERROR',
};

const bridgeScope = 'openid profile email read:profile write:profile';

function normalizeOrigin(value) {
  const origin = (value || '').trim();
  if (!origin) return '';

  try {
    return new URL(origin).origin;
  } catch {
    return origin.replace(/\/+$/, '');
  }
}

function parseAllowedOrigins() {
  return (import.meta.env.VITE_AUTH_BRIDGE_ALLOWED_ORIGINS || '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);
}

function bridgeParamsFromLocation() {
  const params = new URLSearchParams(window.location.search);
  return {
    returnOrigin: params.get('return_origin') || '',
    nonce: params.get('nonce') || '',
    consentAttempted: params.get('consent_attempt') === '1',
  };
}

export function isConsentRequiredError(error) {
  const code = String(error?.error || error?.code || '').toLowerCase();
  const message = String(error?.error_description || error?.message || '').toLowerCase();
  return code === 'consent_required' || message.includes('consent required') || message.includes('consent_required');
}

function callbackPathFor(returnOrigin, nonce, consentAttempted = false) {
  const params = new URLSearchParams({
    return_origin: normalizeOrigin(returnOrigin),
    nonce,
  });
  if (consentAttempted) params.set('consent_attempt', '1');
  return `/auth/bridge/callback?${params.toString()}`;
}

function bridgeAuthorizationParams(prompt) {
  return {
    redirect_uri: `${window.location.origin}/auth/bridge/callback`,
    audience: import.meta.env.VITE_BACKEND_URL,
    scope: bridgeScope,
    ...(prompt ? { prompt } : {}),
  };
}

function isAllowedOrigin(origin) {
  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) return false;

  const allowedOrigins = parseAllowedOrigins();
  if (allowedOrigins.includes(normalizedOrigin)) return true;

  if (import.meta.env.DEV) {
    try {
      const parsed = new URL(normalizedOrigin);
      return ['localhost', '127.0.0.1'].includes(parsed.hostname);
    } catch {
      return false;
    }
  }

  return false;
}

function decodeJwtPayload(token) {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(window.atob(normalized));
  } catch {
    return null;
  }
}

function postToOpener(returnOrigin, payload) {
  const targetOrigin = normalizeOrigin(returnOrigin);
  if (window.opener && targetOrigin) {
    window.opener.postMessage(payload, targetOrigin);
  }
}

function closePopupSoon() {
  window.setTimeout(() => {
    window.close();
  }, 250);
}

function AuthBridgeShell({ children }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      padding: 24,
      color: '#f8fbff',
      background: '#07111f',
      fontFamily: 'Inter, system-ui, sans-serif',
      textAlign: 'center',
    }}>
      <div>{children}</div>
    </div>
  );
}

export function AuthBridgeStart() {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
  const navigate = useNavigate();
  const { returnOrigin, nonce } = bridgeParamsFromLocation();
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (!isAllowedOrigin(returnOrigin)) {
      setError('This companion origin is not allowed by Cerbanimo.');
      postToOpener(returnOrigin, {
        type: bridgeMessageTypes.error,
        error: 'origin_not_allowed',
        nonce,
      });
      closePopupSoon();
      return;
    }

    if (isLoading) return;

    const normalizedReturnOrigin = normalizeOrigin(returnOrigin);
    const callbackPath = callbackPathFor(normalizedReturnOrigin, nonce);

    if (isAuthenticated) {
      navigate(callbackPath, { replace: true });
      return;
    }

    loginWithRedirect({
      appState: { returnTo: callbackPath },
      authorizationParams: bridgeAuthorizationParams(),
    }).catch(loginError => {
      setError(loginError.message || 'Unable to start Cerbanimo login.');
      postToOpener(returnOrigin, {
        type: bridgeMessageTypes.error,
        error: 'login_start_failed',
        message: loginError.message,
        nonce,
      });
      closePopupSoon();
    });
  }, [isAuthenticated, isLoading, loginWithRedirect, navigate, nonce, returnOrigin]);

  if (error) {
    return <AuthBridgeShell>{error}</AuthBridgeShell>;
  }

  return <AuthBridgeShell>Opening Cerbanimo login...</AuthBridgeShell>;
}

export function AuthBridgeCallback() {
  const {
    isAuthenticated,
    isLoading,
    user,
    getAccessTokenSilently,
    loginWithRedirect,
  } = useAuth0();
  const { returnOrigin, nonce, consentAttempted } = bridgeParamsFromLocation();
  const [status, setStatus] = React.useState('Completing Cerbanimo login...');

  React.useEffect(() => {
    let cancelled = false;

    const completeBridgeLogin = async () => {
      if (isLoading) return;

      if (!isAllowedOrigin(returnOrigin)) {
        setStatus('This companion origin is not allowed by Cerbanimo.');
        postToOpener(returnOrigin, {
          type: bridgeMessageTypes.error,
          error: 'origin_not_allowed',
          nonce,
        });
        closePopupSoon();
        return;
      }

      if (!isAuthenticated) {
        await loginWithRedirect({
          appState: {
            returnTo: callbackPathFor(returnOrigin, nonce),
          },
          authorizationParams: bridgeAuthorizationParams(),
        });
        return;
      }

      try {
        const accessToken = await getAccessTokenSilently({
          authorizationParams: bridgeAuthorizationParams(),
        });

        if (user?.sub) {
          await axios.post(
            `${import.meta.env.VITE_BACKEND_URL}/auth/save-user`,
            {
              sub: user.sub,
              email: user.email,
              name: user.name || user.nickname || user.email?.split('@')[0] || 'Cerbanimo User',
              picture: user.picture,
            },
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
        }

        if (cancelled) return;

        const tokenPayload = decodeJwtPayload(accessToken);
        postToOpener(returnOrigin, {
          type: bridgeMessageTypes.success,
          tokenType: 'Bearer',
          accessToken,
          expiresAt: tokenPayload?.exp ? tokenPayload.exp * 1000 : null,
          audience: import.meta.env.VITE_BACKEND_URL,
          user: {
            sub: user?.sub,
            email: user?.email,
            name: user?.name || user?.nickname,
            picture: user?.picture,
          },
          nonce,
        });

        setStatus('Login complete. Returning to your companion...');
        closePopupSoon();
      } catch (error) {
        if (cancelled) return;

        if (isConsentRequiredError(error) && !consentAttempted) {
          setStatus('Cerbanimo needs your permission to connect this companion...');
          try {
            await loginWithRedirect({
              appState: {
                returnTo: callbackPathFor(returnOrigin, nonce, true),
              },
              authorizationParams: bridgeAuthorizationParams('consent'),
            });
          } catch (consentError) {
            if (cancelled) return;
            setStatus('Cerbanimo could not open the permission request.');
            postToOpener(returnOrigin, {
              type: bridgeMessageTypes.error,
              error: 'consent_start_failed',
              message: consentError.message,
              nonce,
            });
            closePopupSoon();
          }
          return;
        }

        setStatus('Cerbanimo login could not be completed.');
        postToOpener(returnOrigin, {
          type: bridgeMessageTypes.error,
          error: 'token_exchange_failed',
          message: error.message,
          nonce,
        });
        closePopupSoon();
      }
    };

    completeBridgeLogin();

    return () => {
      cancelled = true;
    };
  }, [
    getAccessTokenSilently,
    consentAttempted,
    isAuthenticated,
    isLoading,
    loginWithRedirect,
    nonce,
    returnOrigin,
    user,
  ]);

  return <AuthBridgeShell>{status}</AuthBridgeShell>;
}
