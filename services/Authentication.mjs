import qs from 'qs';

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const redirectUri = 'https://' + process.env.URL + process.env.REDIRECT_PATH;
const openidConfiguration = process.env.OPENID_CONFIGURATION;

let endpoints, publicKey;
let authorizationEndpoint, tokenEndpoint, jwksUri, endSessionEndpoint;

export async function getEndpoints() {
  if (authorizationEndpoint && tokenEndpoint && jwksUri && endSessionEndpoint) {
    return {
      authorizationEndpoint,
      tokenEndpoint,
      jwksUri,
      endSessionEndpoint,
    };
  }

  if (!endpoints) {
    const response = await fetch(openidConfiguration);
    if (response.ok) endpoints = await response.json();
    else
      throw new Error(
        `Failed to fetch OpenID configuration: ${response.statusText}`
      );
  }

  authorizationEndpoint = endpoints.authorization_endpoint;
  tokenEndpoint = endpoints.token_endpoint;
  jwksUri = endpoints.jwks_uri;
  endSessionEndpoint = endpoints.end_session_endpoint;

  return {
    authorizationEndpoint,
    tokenEndpoint,
    jwksUri,
    endSessionEndpoint,
  };
}

export async function getRedirectUrl(silent = false) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'openid',
    response_mode: 'query',
    ...(silent && { prompt: 'none' }),
  });
  authorizationEndpoint = (await getEndpoints()).authorizationEndpoint;
  return `${authorizationEndpoint}?${params.toString()}`;
}

export async function getLogoutUrl() {
  endSessionEndpoint = (await getEndpoints()).endSessionEndpoint;
  return endSessionEndpoint;
}

export async function getPublicKey(kid) {
  if (!publicKey) {
    jwksUri = (await getEndpoints()).jwksUri;
    const response = await fetch(jwksUri);
    if (response.ok) {
      const data = await response.json();
      publicKey = data.keys.find((key) => key.kid === kid);
    } else
      throw new Error(`Failed to fetch public key: ${response.statusText}`);
  }
  return `-----BEGIN CERTIFICATE-----\n${publicKey.x5c[0]}\n-----END CERTIFICATE-----`;
}

export async function getTokens({ code, token }, refresh = false) {
  tokenEndpoint = (await getEndpoints()).tokenEndpoint;
  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: qs.stringify({
      grant_type: refresh ? 'refresh_token' : 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      ...(refresh
        ? { refresh_token: token }
        : { code, redirect_uri: redirectUri }),
    }),
  });
  if (response.ok) {
    const { access_token, refresh_token } = await response.json();
    return { ok: true, access_token, refresh_token };
  } else return { ok: false };
}
