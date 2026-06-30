import { useEffect, useState, useRef } from 'react';
import { Routes, Route, Navigate } from 'react-router';
import { Toaster } from 'react-hot-toast';
import { TooltipProvider } from './components/ui/tooltip';
import { ThemeProvider } from './components/ThemeProvider';

// Pages
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Automations from './pages/Automations';
import Calendar from './pages/Calendar';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Layout from './components/Layout';
import AgentHUD from './components/AgentHUD';
import { apiFetch } from './lib/utils';

// Mock user for bypass login
const MOCK_USER = {
  uid: 'mock-user-123',
  displayName: 'Executive',
  email: 'user@example.com',
  photoURL: null,
} as any;

function BatteryMonitor() {
  const isInitialMount = useRef(true);

  useEffect(() => {
    let batteryInstance: any;
    let onChargingChange: any;
    let onLevelChange: any;

    const handleBatteryUpdate = (battery: any, eventType: string) => {
      // Don't alert on first load unless necessary, mainly just on change
      if (isInitialMount.current) {
         isInitialMount.current = false;
         return;
      }

      const lowBatteryAlert = localStorage.getItem('actionpilot_low_battery') !== 'false';
      const chargingAlert = localStorage.getItem('actionpilot_charging') !== 'false';
      const fullBatteryAlert = localStorage.getItem('actionpilot_full_battery') !== 'false';

      if (eventType === 'chargingchange') {
        if (chargingAlert && battery.charging) {
          const utterance = new SpeechSynthesisUtterance("Device is now charging.");
          window.speechSynthesis.speak(utterance);
        } else if (chargingAlert && !battery.charging) {
          const utterance = new SpeechSynthesisUtterance("Device disconnected from power.");
          window.speechSynthesis.speak(utterance);
        }
      }

      if (eventType === 'levelchange') {
        if (lowBatteryAlert && !battery.charging && battery.level <= 0.20 && battery.level > 0.19) {
          const utterance = new SpeechSynthesisUtterance(`Warning. Battery level is at ${Math.round(battery.level * 100)} percent. Please plug in your device.`);
          window.speechSynthesis.speak(utterance);
        }

        if (fullBatteryAlert && battery.charging && battery.level === 1) {
          const utterance = new SpeechSynthesisUtterance("Device is fully charged.");
          window.speechSynthesis.speak(utterance);
        }
      }
    };

    if ('getBattery' in navigator) {
      (navigator as any).getBattery()
        .then((battery: any) => {
          batteryInstance = battery;
          onChargingChange = () => handleBatteryUpdate(battery, 'chargingchange');
          onLevelChange = () => handleBatteryUpdate(battery, 'levelchange');
          
          battery.addEventListener('chargingchange', onChargingChange);
          battery.addEventListener('levelchange', onLevelChange);
        })
        .catch((err: any) => {
          console.warn("Battery API not supported or disallowed in this frame context:", err);
        });
    }

    return () => {
      if (batteryInstance) {
        if (onChargingChange) batteryInstance.removeEventListener('chargingchange', onChargingChange);
        if (onLevelChange) batteryInstance.removeEventListener('levelchange', onLevelChange);
      }
    };
  }, []);

  return null;
}

function WellnessMonitor() {
  useEffect(() => {
    // Keep track of last alert times to avoid spamming
    let lastWaterAlert = Date.now();
    let lastStretchAlert = Date.now();
    let lastMedAlerts: Record<string, boolean> = {}; // track if alerted today
    let lastCustomWaterAlerts: Record<string, boolean> = {};
    let lastCustomStretchAlerts: Record<string, boolean> = {};
    let lastEventAlerts: Record<string, boolean> = {}; 

    const playAlert = (text: string) => {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
      } catch(e) {}
      
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.pitch = 1.2;
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
      }, 300);
    };

    const interval = setInterval(() => {
      const now = new Date();
      const currentHours = now.getHours().toString().padStart(2, '0');
      const currentMinutes = now.getMinutes().toString().padStart(2, '0');
      const currentTimeString = `${currentHours}:${currentMinutes}`;
      const todayDateString = now.toISOString().split('T')[0];
      // Format MM-DD for recurring yearly events
      const todayMonthDay = todayDateString.substring(5);

      // Water Check
      const waterEnabled = localStorage.getItem('actionpilot_water_alerts') === 'true';
      const waterIntervalMins = parseInt(localStorage.getItem('actionpilot_water_interval') || '120', 10);
      if (waterEnabled && Date.now() - lastWaterAlert > waterIntervalMins * 60 * 1000) {
        playAlert("Time to hydrate! Drink a glass of water.");
        lastWaterAlert = Date.now();
      }

      // Stretch Check
      const stretchEnabled = localStorage.getItem('actionpilot_stretch_alerts') === 'true';
      const stretchIntervalMins = parseInt(localStorage.getItem('actionpilot_stretch_interval') || '60', 10);
      if (stretchEnabled && Date.now() - lastStretchAlert > stretchIntervalMins * 60 * 1000) {
        playAlert("Time to stretch! Take a quick physical break.");
        lastStretchAlert = Date.now();
      }

      // Medication Check
      const medsStr = localStorage.getItem('actionpilot_medications');
      if (medsStr) {
        try {
          const meds = JSON.parse(medsStr);
          meds.forEach((med: any) => {
            const medKey = `${med.id}_${todayDateString}`;
            if (med.time === currentTimeString && !lastMedAlerts[medKey]) {
              playAlert(`Medication reminder: It is time to take ${med.name}.`);
              lastMedAlerts[medKey] = true;
            }
          });
        } catch(e) {}
      }

      // Custom Water Check
      const customWaterStr = localStorage.getItem('actionpilot_custom_water_reminders');
      if (customWaterStr) {
        try {
          const customWaterList = JSON.parse(customWaterStr);
          customWaterList.forEach((water: any) => {
            const waterKey = `${water.id}_${todayDateString}`;
            if (water.time === currentTimeString && !lastCustomWaterAlerts[waterKey]) {
              playAlert(`Hydration reminder: ${water.name}.`);
              lastCustomWaterAlerts[waterKey] = true;
            }
          });
        } catch(e) {}
      }

      // Custom Stretch Check
      const customStretchStr = localStorage.getItem('actionpilot_custom_stretch_reminders');
      if (customStretchStr) {
        try {
          const customStretchList = JSON.parse(customStretchStr);
          customStretchList.forEach((stretch: any) => {
            const stretchKey = `${stretch.id}_${todayDateString}`;
            if (stretch.time === currentTimeString && !lastCustomStretchAlerts[stretchKey]) {
              playAlert(`Posture and stretching reminder: ${stretch.name}.`);
              lastCustomStretchAlerts[stretchKey] = true;
            }
          });
        } catch(e) {}
      }

      // Events Check
      const eventsStr = localStorage.getItem('actionpilot_events');
      if (eventsStr) {
        try {
          const events = JSON.parse(eventsStr);
          events.forEach((evt: any) => {
            // Check if MM-DD matches for birthdays/anniversaries
            const evtMonthDay = evt.date.substring(5);
            const evtKey = `${evt.id}_${todayDateString}`;
            
            // Alert once at 9:00 AM on the day of the event
            if (evtMonthDay === todayMonthDay && currentTimeString === "09:00" && !lastEventAlerts[evtKey]) {
              playAlert(`Event reminder: Today is ${evt.name}'s ${evt.type}!`);
              lastEventAlerts[evtKey] = true;
            }
          });
        } catch(e) {}
      }
      
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  return null;
}

function GmailMonitor() {
  useEffect(() => {
    let lastCheckedTime = Math.floor(Date.now() / 1000); // Check messages since app load

    const playAlert = (text: string) => {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
      } catch(e) {}
      
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.pitch = 1.2;
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
      }, 300);
    };

    const checkGmail = async () => {
      const token = localStorage.getItem('actionpilot_gmail_token');
      if (!token) return;

      try {
        // Find unread emails received after lastCheckedTime
        const query = `is:unread after:${lastCheckedTime}`;
        const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=5`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (res.status === 401) {
          // Token expired
          localStorage.removeItem('actionpilot_gmail_token');
          return;
        }

        const data = await res.json();
        
        if (data.messages && data.messages.length > 0) {
          lastCheckedTime = Math.floor(Date.now() / 1000); // Update check time

          for (const msg of data.messages) {
            // Get full message details
            const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            const msgData = await msgRes.json();
            
            let subject = '';
            const headers = msgData.payload?.headers || [];
            for (const header of headers) {
              if (header.name.toLowerCase() === 'subject') {
                subject = header.value;
                break;
              }
            }
            
            const snippet = msgData.snippet || '';

            // Send to AI for analysis
            const aiRes = await apiFetch('/api/ai/analyze-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ subject, snippet })
            });
            
            const aiData = await aiRes.json();
            if (aiData.isAlertWorthy && aiData.alertMessage) {
              playAlert(aiData.alertMessage);
              // Wait a bit between alerts if multiple
              await new Promise(resolve => setTimeout(resolve, 5000));
            }
          }
        }
      } catch(e) {
        console.error("Gmail check error", e);
      }
    };

    // Check every 2 minutes
    const interval = setInterval(checkGmail, 120000);
    
    // Initial check after 5 seconds
    const initialTimeout = setTimeout(checkGmail, 5000);
    
    return () => {
      clearInterval(interval);
      clearTimeout(initialTimeout);
    };
  }, []);

  return null;
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="actionpilot-theme">
      <TooltipProvider>
        <BatteryMonitor />
        <WellnessMonitor />
        <GmailMonitor />
        <AgentHUD />
        <div className="min-h-screen bg-background font-sans text-foreground">
          <Toaster position="bottom-right" />
          <Routes>
            <Route path="/" element={<Layout user={MOCK_USER} />}>
              <Route index element={<Dashboard user={MOCK_USER} />} />
              <Route path="tasks" element={<Tasks />} />
              <Route path="automations" element={<Automations />} />
              <Route path="calendar" element={<Calendar />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="settings" element={<Settings user={MOCK_USER} />} />
            </Route>
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </TooltipProvider>
    </ThemeProvider>
  );
}
