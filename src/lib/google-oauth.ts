import { createServer } from 'http';
import { randomBytes } from 'crypto';
import { URL } from 'url';

export type OAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
};

export function buildGoogleAuthUrl(config: OAuthConfig) {
  const state = randomBytes(16).toString('hex');
  const url = new URL(config.authUrl);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', config.scopes.join(' '));
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('state', state);
  return { url: url.toString(), state };
}

export async function exchangeCodeForTokens(config: OAuthConfig, code: string) {
  const params = new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: 'authorization_code'
  });

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed with status ${response.status}`);
  }

  return response.json();
}

export function startLocalCallbackServer() {
  return new Promise<{ code: string; state: string }>((resolve, reject) => {
    const server = createServer((request, response) => {
      const url = new URL((request.url ?? '/'), 'http://localhost');
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');

      if (!code || !state) {
        response.writeHead(400);
        response.end('Missing OAuth callback parameters');
        reject(new Error('Missing OAuth callback parameters'));
        return;
      }

      response.writeHead(200, { 'Content-Type': 'text/plain' });
      response.end('Jarvis is authorized. You can close this window now.');
      server.close();
      resolve({ code, state });
    });

    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') return;
      const port = address.port;
      const authUrl = `http://127.0.0.1:${port}`;
      console.log(`OAuth callback server listening on ${authUrl}`);
    });
  });
}
