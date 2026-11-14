import { useState } from 'react';
import { buildGoogleAuthUrl, exchangeCodeForTokens, startLocalCallbackServer } from './google-oauth';

const GOOGLE_CONFIG = {
  clientId: 'YOUR_GOOGLE_CLIENT_ID',
  clientSecret: 'YOUR_GOOGLE_CLIENT_SECRET',
  redirectUri: 'http://127.0.0.1',
  authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  scopes: ['https://www.googleapis.com/auth/calendar']
};

export function useGoogleCalendarAuth() {
  const [status, setStatus] = useState('Not connected');

  async function connect() {
    const { url, state } = buildGoogleAuthUrl(GOOGLE_CONFIG);
    const callback = await startLocalCallbackServer();
    window.open(url, '_blank', 'noopener,noreferrer');

    const { code } = callback;
    const tokens = await exchangeCodeForTokens(GOOGLE_CONFIG, code);
    localStorage.setItem('jarvis.google.tokens', JSON.stringify(tokens));
    localStorage.setItem('jarvis.google.state', state);
    setStatus('Connected');
    return tokens;
  }

  async function listEvents() {
    const stored = localStorage.getItem('jarvis.google.tokens');
    if (!stored) return [];
    const tokens = JSON.parse(stored);
    const now = new Date();
    const end = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7);

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now.toISOString()}&timeMax=${end.toISOString()}&singleEvents=true&orderBy=startTime`,
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch Google Calendar events.');
    }

    const data = await response.json() as { items?: Array<{ summary?: string; start?: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string } }> };
    return (data.items ?? []).map((item) => ({
      summary: item.summary ?? 'Untitled event',
      start: item.start?.dateTime ?? item.start?.date ?? '',
      end: item.end?.dateTime ?? item.end?.date ?? ''
    }));
  }

  return { status, connect, listEvents };
}
