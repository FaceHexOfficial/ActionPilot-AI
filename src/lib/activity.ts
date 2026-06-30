import { ActivityLogEntry } from '../types';

export function logActivity(
  type: ActivityLogEntry['type'],
  message: string,
  metadata?: any
) {
  const newEntry: ActivityLogEntry = {
    id: crypto.randomUUID(),
    type,
    message,
    timestamp: new Date().toISOString(),
    metadata
  };

  try {
    const saved = localStorage.getItem('actionpilot_activity');
    let logs: ActivityLogEntry[] = [];
    if (saved) {
      logs = JSON.parse(saved);
    }
    
    // Add to beginning and keep max 50 items
    logs.unshift(newEntry);
    if (logs.length > 50) {
      logs = logs.slice(0, 50);
    }

    localStorage.setItem('actionpilot_activity', JSON.stringify(logs));
    window.dispatchEvent(new Event('activity_updated'));
  } catch (error) {
    console.error('Failed to log activity', error);
  }
}

export function getActivities(): ActivityLogEntry[] {
  try {
    const saved = localStorage.getItem('actionpilot_activity');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Failed to parse activity log', error);
  }
  return [];
}
