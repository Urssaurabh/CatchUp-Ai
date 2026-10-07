import type { Meeting } from '../types';

const DB_NAME = 'CatchUpAI_DB';
const DB_VERSION = 1;
const VIDEO_STORE = 'recorded_videos';

// Open IndexedDB database
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(VIDEO_STORE)) {
        db.createObjectStore(VIDEO_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Store recorded video blob into IndexedDB
export async function saveVideoBlob(meetingId: string, blob: Blob): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(VIDEO_STORE, 'readwrite');
      const store = tx.objectStore(VIDEO_STORE);
      const req = store.put(blob, meetingId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to store video in IndexedDB:', err);
  }
}

// Retrieve video blob from IndexedDB
export async function getVideoBlob(meetingId: string): Promise<Blob | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(VIDEO_STORE, 'readonly');
      const store = tx.objectStore(VIDEO_STORE);
      const req = store.get(meetingId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to get video from IndexedDB:', err);
    return null;
  }
}

// Fetch meetings from Backend API with local fallback
export async function fetchMeetings(): Promise<Meeting[]> {
  try {
    const res = await fetch('/api/meetings');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        localStorage.setItem('catchup_meetings_cache', JSON.stringify(data));
        return data;
      }
    }
  } catch {
    console.warn('Backend fetch failed, falling back to local storage cache');
  }

  const cached = localStorage.getItem('catchup_meetings_cache');
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // ignore
    }
  }

  return [];
}

// Save meeting to Backend API and local cache
export async function saveMeeting(meeting: Meeting, token?: string | null): Promise<void> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const activeToken = token || localStorage.getItem('catchup_auth_token');
    if (activeToken) {
      headers['Authorization'] = `Bearer ${activeToken}`;
    }

    await fetch('/api/meetings', {
      method: 'POST',
      headers,
      body: JSON.stringify(meeting),
    });
  } catch (err) {
    console.warn('Could not post meeting to backend:', err);
  }

  // Update local storage cache
  try {
    const cached = localStorage.getItem('catchup_meetings_cache');
    let meetings: Meeting[] = cached ? JSON.parse(cached) : [];
    const idx = meetings.findIndex((m) => m.id === meeting.id);
    if (idx >= 0) {
      meetings[idx] = meeting;
    } else {
      meetings.unshift(meeting);
    }
    localStorage.setItem('catchup_meetings_cache', JSON.stringify(meetings));
  } catch (err) {
    console.error('Failed to update local storage:', err);
  }
}

// Delete meeting with Authorization header
export async function deleteMeeting(meetingId: string, token?: string | null): Promise<void> {
  const headers: Record<string, string> = {};
  const activeToken = token || localStorage.getItem('catchup_auth_token');
  if (activeToken) {
    headers['Authorization'] = `Bearer ${activeToken}`;
  }

  const res = await fetch(`/api/meetings/${meetingId}`, {
    method: 'DELETE',
    headers,
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `Failed to delete meeting (${res.status})`);
  }

  // Update local storage cache
  try {
    const cached = localStorage.getItem('catchup_meetings_cache');
    if (cached) {
      let meetings: Meeting[] = JSON.parse(cached);
      meetings = meetings.filter((m) => m.id !== meetingId);
      localStorage.setItem('catchup_meetings_cache', JSON.stringify(meetings));
    }
  } catch (err) {
    console.error('Failed to update local storage after delete:', err);
  }
}

// Format seconds into MM:SS or HH:MM:SS
export function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
