import { useGoogleCalendarAuth } from './lib/google-calendar';

const { connect, listEvents } = useGoogleCalendarAuth();

export async function syncCalendarEvents() {
  try {
    const events = await listEvents();
    return events;
  } catch (error) {
    console.error('Calendar sync failed:', error);
    return [];
  }
}

export async function authorizeGoogleCalendar() {
  try {
    const tokens = await connect();
    return tokens;
  } catch (error) {
    console.error('Google auth failed:', error);
    return null;
  }
}
