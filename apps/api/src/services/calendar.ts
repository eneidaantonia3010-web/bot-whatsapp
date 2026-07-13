// ============================================
// Google Calendar Service
// ============================================

import { google, calendar_v3 } from 'googleapis';

let calendarClient: calendar_v3.Calendar | null = null;

function getCalendarClient(): calendar_v3.Calendar | null {
  if (calendarClient) return calendarClient;

  const credentials = process.env.GOOGLE_CREDENTIALS;
  if (!credentials) {
    console.warn('⚠️ GOOGLE_CREDENTIALS not set. Calendar integration disabled.');
    return null;
  }

  try {
    const parsedCreds = JSON.parse(credentials);
    const auth = new google.auth.GoogleAuth({
      credentials: parsedCreds,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });

    calendarClient = google.calendar({ version: 'v3', auth });
    return calendarClient;
  } catch (error) {
    console.error('❌ Failed to initialize Google Calendar:', error);
    return null;
  }
}

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';

export async function createCalendarEvent(data: {
  summary: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendeeEmail?: string;
}): Promise<string | null> {
  const calendar = getCalendarClient();
  if (!calendar) return null;

  try {
    const event: calendar_v3.Schema$Event = {
      summary: data.summary,
      description: data.description || '',
      start: {
        dateTime: data.startTime.toISOString(),
        timeZone: 'America/Argentina/Buenos_Aires',
      },
      end: {
        dateTime: data.endTime.toISOString(),
        timeZone: 'America/Argentina/Buenos_Aires',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 60 },
          { method: 'popup', minutes: 15 },
        ],
      },
    };

    if (data.attendeeEmail) {
      event.attendees = [{ email: data.attendeeEmail }];
    }

    const response = await calendar.events.insert({
      calendarId: CALENDAR_ID,
      requestBody: event,
    });

    console.log(`📅 Calendar event created: ${response.data.id}`);
    return response.data.id || null;
  } catch (error) {
    console.error('❌ Failed to create calendar event:', error);
    return null;
  }
}

export async function deleteCalendarEvent(eventId: string): Promise<boolean> {
  const calendar = getCalendarClient();
  if (!calendar) return false;

  try {
    await calendar.events.delete({
      calendarId: CALENDAR_ID,
      eventId,
    });
    console.log(`🗑️ Calendar event deleted: ${eventId}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to delete calendar event:', error);
    return false;
  }
}

export async function getFreeBusy(startDate: Date, endDate: Date): Promise<Array<{ start: string; end: string }>> {
  const calendar = getCalendarClient();
  if (!calendar) return [];

  try {
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        timeZone: 'America/Argentina/Buenos_Aires',
        items: [{ id: CALENDAR_ID }],
      },
    });

    const busy = response.data.calendars?.[CALENDAR_ID]?.busy || [];
    return busy.map((b) => ({
      start: b.start || '',
      end: b.end || '',
    }));
  } catch (error) {
    console.error('❌ Failed to get free/busy:', error);
    return [];
  }
}
