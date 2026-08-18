/**
 * Bridge for the React Native app: Entra ID redirects to the web callback URL, which hands the
 * authorization code to the app over its custom scheme. Hardcoded so a caller can never steer the
 * code at an arbitrary target.
 */
export const MOBILE_APP_CALLBACK_URL = 'nimsmobile://auth/callback';

export function buildMobileAppCallbackUrl(params: Record<string, string>): string {
  return `${MOBILE_APP_CALLBACK_URL}?${new URLSearchParams(params).toString()}`;
}

/**
 * Reads the unsigned body of an OAuth state token. Only used to tell a mobile flow from a web one;
 * the signature is still verified server-side before any code is exchanged.
 */
export function isMobileOAuthState(state: string): boolean {
  const body = state.split('.')[0];
  if (!body) return false;

  try {
    const base64 = body.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    return (JSON.parse(atob(padded)) as { mobile?: boolean }).mobile === true;
  } catch {
    return false;
  }
}
