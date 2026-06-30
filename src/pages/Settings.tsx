import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Moon, Sun, Monitor, Bell, Shield, User as UserIcon, Mail, Instagram, Phone, MessageSquare, Volume2, Clock, Zap, Plus, Key, Eye, EyeOff } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { useTheme } from '../components/ThemeProvider';
import { Switch } from '../components/ui/switch';
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useLocation } from 'react-router';
import { Input } from '../components/ui/input';

interface SettingsProps {
  user?: any;
}

export default function Settings({ user }: SettingsProps) {
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const defaultTab = queryParams.get('tab') || 'account';
  
  const [activeTab, setActiveTab] = useState(defaultTab);

  useEffect(() => {
    const tab = queryParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [location.search]);
  
  const [voiceAlerts, setVoiceAlerts] = useState(() => {
    return localStorage.getItem('actionpilot_voice_alerts') === 'true';
  });
  
  const [taskVoiceAlerts, setTaskVoiceAlerts] = useState(() => {
    return localStorage.getItem('actionpilot_task_voice_alerts') === 'true';
  });

  const [wellnessReminders, setWellnessReminders] = useState({
    water: localStorage.getItem('actionpilot_water_alerts') === 'true',
    stretching: localStorage.getItem('actionpilot_stretch_alerts') === 'true'
  });

  const [intervals, setIntervals] = useState({
    water: localStorage.getItem('actionpilot_water_interval') || '120',
    stretch: localStorage.getItem('actionpilot_stretch_interval') || '60'
  });

  const [medications, setMedications] = useState<{id: string, name: string, time: string}[]>(() => {
    const saved = localStorage.getItem('actionpilot_medications');
    return saved ? JSON.parse(saved) : [];
  });

  const [customWaterReminders, setCustomWaterReminders] = useState<{id: string, name: string, time: string}[]>(() => {
    const saved = localStorage.getItem('actionpilot_custom_water_reminders');
    return saved ? JSON.parse(saved) : [];
  });

  const [customStretchReminders, setCustomStretchReminders] = useState<{id: string, name: string, time: string}[]>(() => {
    const saved = localStorage.getItem('actionpilot_custom_stretch_reminders');
    return saved ? JSON.parse(saved) : [];
  });

  const [importantEvents, setImportantEvents] = useState<{id: string, name: string, date: string, type: string}[]>(() => {
    const saved = localStorage.getItem('actionpilot_events');
    return saved ? JSON.parse(saved) : [];
  });

  const [deviceAlerts, setDeviceAlerts] = useState({
    lowBattery: localStorage.getItem('actionpilot_low_battery') !== 'false', // default true
    charging: localStorage.getItem('actionpilot_charging') !== 'false',
    fullBattery: localStorage.getItem('actionpilot_full_battery') !== 'false'
  });

  useEffect(() => {
    localStorage.setItem('actionpilot_water_alerts', String(wellnessReminders.water));
    localStorage.setItem('actionpilot_stretch_alerts', String(wellnessReminders.stretching));
  }, [wellnessReminders]);

  useEffect(() => {
    localStorage.setItem('actionpilot_medications', JSON.stringify(medications));
  }, [medications]);

  useEffect(() => {
    localStorage.setItem('actionpilot_custom_water_reminders', JSON.stringify(customWaterReminders));
  }, [customWaterReminders]);

  useEffect(() => {
    localStorage.setItem('actionpilot_custom_stretch_reminders', JSON.stringify(customStretchReminders));
  }, [customStretchReminders]);

  useEffect(() => {
    localStorage.setItem('actionpilot_events', JSON.stringify(importantEvents));
  }, [importantEvents]);

  useEffect(() => {
    localStorage.setItem('actionpilot_low_battery', String(deviceAlerts.lowBattery));
    localStorage.setItem('actionpilot_charging', String(deviceAlerts.charging));
    localStorage.setItem('actionpilot_full_battery', String(deviceAlerts.fullBattery));
  }, [deviceAlerts]);

  const [connectedAccounts, setConnectedAccounts] = useState({
    instagram: localStorage.getItem('actionpilot_connected_instagram') === 'true',
    whatsapp: localStorage.getItem('actionpilot_connected_whatsapp') === 'true',
    sms: localStorage.getItem('actionpilot_connected_sms') === 'true',
    gmail: localStorage.getItem('actionpilot_connected_gmail') === 'true' || localStorage.getItem('actionpilot_gmail_token') !== null
  });

  const [geminiApiKey, setGeminiApiKey] = useState(() => {
    return localStorage.getItem('user_gemini_api_key') || '';
  });
  const [showGeminiKey, setShowGeminiKey] = useState(false);

  const handleSaveGeminiKey = () => {
    localStorage.setItem('user_gemini_api_key', geminiApiKey);
    toast.success("Gemini API Key saved successfully!");
  };

  const handleClearGeminiKey = () => {
    setGeminiApiKey('');
    localStorage.removeItem('user_gemini_api_key');
    toast.success("Gemini API Key removed.");
  };

  const [connectingPlatform, setConnectingPlatform] = useState<keyof typeof connectedAccounts | null>(null);
  const [isSimulatingAuth, setIsSimulatingAuth] = useState(false);
  const [authMethod, setAuthMethod] = useState<'sandbox' | 'oauth' | 'credentials'>('sandbox');
  const [customCreds, setCustomCreds] = useState({
    token: '',
    appPassword: '',
    phoneId: '',
    twilioSid: '',
    twilioToken: ''
  });

  const handleConnectGmail = async () => {
    // Mock connection
    setConnectingPlatform('gmail');
    setTimeout(() => {
      localStorage.setItem('actionpilot_connected_gmail', 'true');
      setConnectedAccounts(prev => ({ ...prev, gmail: true }));
      toast.success("Successfully connected Gmail (Mock Mode)");
      setConnectingPlatform(null);
      window.dispatchEvent(new Event('connections_updated'));
    }, 1000);
  };

  const toggleConnection = (platform: keyof typeof connectedAccounts) => {
    if (connectedAccounts[platform]) {
      // Disconnect directly
      localStorage.removeItem(`actionpilot_connected_${platform}`);
      if (platform === 'gmail') {
        localStorage.removeItem('actionpilot_gmail_token');
      }
      setConnectedAccounts(prev => ({ ...prev, [platform]: false }));
      toast('Account disconnected');
      window.dispatchEvent(new Event('connections_updated'));
    } else {
      setConnectingPlatform(platform);
      setAuthMethod('sandbox'); // Default to sandbox/safe mode
    }
  };

  const confirmConnection = () => {
    if (!connectingPlatform) return;
    setIsSimulatingAuth(true);

    if (authMethod === 'sandbox') {
      setTimeout(() => {
        const platformName = String(connectingPlatform);
        localStorage.setItem(`actionpilot_connected_${platformName}`, 'true');
        if (platformName === 'gmail') {
          localStorage.setItem('actionpilot_gmail_token', 'sandbox-token-abc123xyz');
        }
        setConnectedAccounts(prev => ({ ...prev, [platformName]: true }));
        toast.success(`Sandbox Link Active: Connected ${platformName === 'sms' ? 'SMS' : platformName.charAt(0).toUpperCase() + platformName.slice(1)}!`);
        setIsSimulatingAuth(false);
        setConnectingPlatform(null);
        window.dispatchEvent(new Event('connections_updated'));
      }, 1200);
      return;
    }

    if (authMethod === 'credentials') {
      // Validate credentials depending on platform
      if (connectingPlatform === 'gmail' && !customCreds.appPassword) {
        toast.error('Please enter your Google App Password');
        setIsSimulatingAuth(false);
        return;
      }
      if (connectingPlatform === 'instagram' && !customCreds.token) {
        toast.error('Please enter a Page Access Token');
        setIsSimulatingAuth(false);
        return;
      }
      if (connectingPlatform === 'whatsapp' && (!customCreds.token || !customCreds.phoneId)) {
        toast.error('Please enter WhatsApp Phone ID and Access Token');
        setIsSimulatingAuth(false);
        return;
      }
      if (connectingPlatform === 'sms' && (!customCreds.twilioSid || !customCreds.twilioToken)) {
        toast.error('Please enter Twilio Account SID and Auth Token');
        setIsSimulatingAuth(false);
        return;
      }

      setTimeout(() => {
        const platformName = String(connectingPlatform);
        localStorage.setItem(`actionpilot_connected_${platformName}`, 'true');
        localStorage.setItem(`actionpilot_${platformName}_creds`, JSON.stringify(customCreds));
        if (platformName === 'gmail') {
          localStorage.setItem('actionpilot_gmail_token', customCreds.appPassword);
        }
        setConnectedAccounts(prev => ({ ...prev, [platformName]: true }));
        toast.success(`Connected ${platformName === 'sms' ? 'SMS' : platformName.charAt(0).toUpperCase() + platformName.slice(1)} using credentials!`);
        setIsSimulatingAuth(false);
        setConnectingPlatform(null);
        window.dispatchEvent(new Event('connections_updated'));
      }, 1500);
      return;
    }

    // Real OAuth Mode
    if (connectingPlatform === 'gmail') {
      handleConnectGmail();
      return;
    }

    if (connectingPlatform === 'sms') {
      const twilioSid = (import.meta as any).env.VITE_TWILIO_ACCOUNT_SID;
      if (!twilioSid) {
        toast.error('Twilio environment credentials missing. Please use Sandbox Mode or Custom Credentials.');
        setIsSimulatingAuth(false);
        return;
      }
    } else {
      const metaClientId = (import.meta as any).env.VITE_META_CLIENT_ID;
      if (!metaClientId) {
        toast.error('Meta Client ID missing in environment. Please use Sandbox Mode or Custom Credentials.');
        setIsSimulatingAuth(false);
        return;
      }
      
      const redirectUri = window.location.origin + '/oauth/callback';
      const scopes = connectingPlatform === 'instagram' 
        ? 'instagram_basic,instagram_manage_messages' 
        : 'whatsapp_business_messaging,whatsapp_business_management';
        
      window.location.href = `https://www.facebook.com/v17.0/dialog/oauth?client_id=${metaClientId}&redirect_uri=${redirectUri}&scope=${scopes}`;
      return;
    }

    const platformName = String(connectingPlatform);
    setTimeout(() => {
      localStorage.setItem(`actionpilot_connected_${platformName}`, 'true');
      setConnectedAccounts(prev => ({ ...prev, [platformName]: true }));
      toast.success(`Successfully connected to ${platformName === 'sms' ? 'SMS' : platformName.charAt(0).toUpperCase() + platformName.slice(1)}`);
      setIsSimulatingAuth(false);
      setConnectingPlatform(null);
      window.dispatchEvent(new Event('connections_updated'));
    }, 1500);
  };

  useEffect(() => {
    localStorage.setItem('actionpilot_voice_alerts', String(voiceAlerts));
  }, [voiceAlerts]);

  useEffect(() => {
    localStorage.setItem('actionpilot_task_voice_alerts', String(taskVoiceAlerts));
  }, [taskVoiceAlerts]);

  return (
    <div className="max-w-4xl mx-auto pb-20 space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground mt-1">Manage your account preferences and application settings.</p>
      </div>

      <Tabs key={activeTab} defaultValue={activeTab} className="w-full">
        <TabsList className="grid w-full max-w-3xl grid-cols-5">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="connections">Connections</TabsTrigger>
          <TabsTrigger value="wellness">Wellness</TabsTrigger>
        </TabsList>
        
        <TabsContent value="account" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Your personal account details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary overflow-hidden">
                    {user?.photoURL ? (
                      <img src={user.photoURL} alt={user.displayName || 'Profile'} className="w-full h-full object-cover" />
                    ) : (
                      user?.displayName ? user.displayName.charAt(0).toUpperCase() : <UserIcon className="w-8 h-8" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{user?.displayName || 'Anonymous User'}</h3>
                    <p className="text-muted-foreground flex items-center gap-1 mt-1">
                      <Mail className="w-4 h-4" />
                      {user?.email || 'No email provided'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Theme</CardTitle>
              <CardDescription>Select the theme for the application.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button 
                  variant={theme === 'light' ? 'default' : 'outline'} 
                  className="w-32 justify-start gap-2"
                  onClick={() => setTheme('light')}
                >
                  <Sun className="w-4 h-4" /> Light
                </Button>
                <Button 
                  variant={theme === 'dark' ? 'default' : 'outline'} 
                  className="w-32 justify-start gap-2"
                  onClick={() => setTheme('dark')}
                >
                  <Moon className="w-4 h-4" /> Dark
                </Button>
                <Button 
                  variant={theme === 'system' ? 'default' : 'outline'} 
                  className="w-32 justify-start gap-2"
                  onClick={() => setTheme('system')}
                >
                  <Monitor className="w-4 h-4" /> System
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Audio & Voice Alerts</CardTitle>
              <CardDescription>Configure text-to-speech settings for messages and tasks.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <Volume2 className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Device Voice Overlay</p>
                    <p className="text-sm text-muted-foreground">Automatically read incoming notifications aloud.</p>
                  </div>
                </div>
                <Switch 
                  checked={voiceAlerts} 
                  onCheckedChange={(c) => setTimeout(() => setVoiceAlerts(c), 0)} 
                />
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Task Time Remaining Alerts</p>
                    <p className="text-sm text-muted-foreground">Voice warnings when tasks are close to deadline (e.g. "2 minutes remaining").</p>
                  </div>
                </div>
                <Switch 
                  checked={taskVoiceAlerts} 
                  onCheckedChange={(c) => setTimeout(() => setTaskVoiceAlerts(c), 0)} 
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System & Battery Alerts</CardTitle>
              <CardDescription>Real-time voice notifications for device charging states.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                    <span className="text-orange-500 text-lg">🔋</span>
                  </div>
                  <div>
                    <p className="font-medium">Low Battery Warning</p>
                    <p className="text-sm text-muted-foreground">Voice alert when device battery falls below 20%.</p>
                  </div>
                </div>
                <Switch 
                  checked={deviceAlerts.lowBattery} 
                  onCheckedChange={(c) => setDeviceAlerts(prev => ({...prev, lowBattery: c}))} 
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                    <span className="text-green-500 text-lg">⚡</span>
                  </div>
                  <div>
                    <p className="font-medium">Charging Status</p>
                    <p className="text-sm text-muted-foreground">Voice alert when device is plugged in to charge.</p>
                  </div>
                </div>
                <Switch 
                  checked={deviceAlerts.charging} 
                  onCheckedChange={(c) => setDeviceAlerts(prev => ({...prev, charging: c}))} 
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <span className="text-emerald-500 text-lg">💯</span>
                  </div>
                  <div>
                    <p className="font-medium">Full Battery Alert</p>
                    <p className="text-sm text-muted-foreground">Voice alert when battery reaches 100%.</p>
                  </div>
                </div>
                <Switch 
                  checked={deviceAlerts.fullBattery} 
                  onCheckedChange={(c) => setDeviceAlerts(prev => ({...prev, fullBattery: c}))} 
                />
              </div>
            </CardContent>
          </Card>


        </TabsContent>

        <TabsContent value="connections" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Connected Accounts</CardTitle>
              <CardDescription>Link external services for automations and messaging.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <Instagram className="w-5 h-5 text-pink-500" />
                  <div>
                    <p className="font-medium">Instagram</p>
                    <p className="text-sm text-muted-foreground">Manage DMs and auto-replies.</p>
                  </div>
                </div>
                <Button 
                  variant={connectedAccounts.instagram ? "destructive" : "secondary"}
                  size="sm"
                  onClick={() => toggleConnection('instagram')}
                >
                  {connectedAccounts.instagram ? 'Disconnect' : 'Connect'}
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <MessageSquare className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="font-medium">WhatsApp</p>
                    <p className="text-sm text-muted-foreground">Sync messages and automation rules.</p>
                  </div>
                </div>
                <Button 
                  variant={connectedAccounts.whatsapp ? "destructive" : "secondary"}
                  size="sm"
                  onClick={() => toggleConnection('whatsapp')}
                >
                  {connectedAccounts.whatsapp ? 'Disconnect' : 'Connect'}
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <Phone className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="font-medium">SMS / Phone</p>
                    <p className="text-sm text-muted-foreground">Send and receive text messages.</p>
                  </div>
                </div>
                <Button 
                  variant={connectedAccounts.sms ? "destructive" : "secondary"}
                  size="sm"
                  onClick={() => toggleConnection('sms')}
                >
                  {connectedAccounts.sms ? 'Disconnect' : 'Connect'}
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <Mail className="w-5 h-5 text-red-500" />
                  <div>
                    <p className="font-medium">Gmail Integration</p>
                    <p className="text-sm text-muted-foreground">Read emails to automatically alert you about appointments and tickets.</p>
                  </div>
                </div>
                <Button 
                  variant={connectedAccounts.gmail ? "destructive" : "secondary"}
                  size="sm"
                  onClick={() => toggleConnection('gmail')}
                >
                  {connectedAccounts.gmail ? 'Disconnect' : 'Connect'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />
                Gemini API Key Configuration
              </CardTitle>
              <CardDescription>
                Provide your custom Gemini API key to power voice commands, task analysis, and execution plans.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Gemini API Key</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showGeminiKey ? "text" : "password"}
                      placeholder="Enter your GEMINI_API_KEY"
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGeminiKey(!showGeminiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <Button onClick={handleSaveGeminiKey} className="shrink-0">
                    Save Key
                  </Button>
                  {localStorage.getItem('user_gemini_api_key') && (
                    <Button variant="destructive" onClick={handleClearGeminiKey} className="shrink-0">
                      Clear
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Your key is stored securely in your browser's local storage and used only to authorize requests to the Gemini models.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wellness" className="mt-6 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Health & Wellness Reminders</CardTitle>
                <CardDescription>Stay healthy while working. Enable specific reminders and the AI coach will notify you with a distinct sound.</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2 hidden sm:flex"
                onClick={() => {
                  try {
                    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                    const ctx = new AudioContext();
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
                    gain.gain.setValueAtTime(0.1, ctx.currentTime);
                    osc.start(ctx.currentTime);
                    osc.stop(ctx.currentTime + 0.2);
                  } catch(e) {}
                  
                  setTimeout(() => {
                    const utterance = new SpeechSynthesisUtterance("Time to hydrate! Drink a glass of water.");
                    utterance.pitch = 1.2;
                    utterance.rate = 0.9;
                    window.speechSynthesis.speak(utterance);
                    toast('Playing wellness alert...', { icon: '💧' });
                  }, 300);
                }}
              >
                <Volume2 className="w-4 h-4" />
                Test Alert
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-4 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <span className="text-blue-500 text-lg">💧</span>
                    </div>
                    <div>
                      <p className="font-medium">Hydration Alerts</p>
                      <p className="text-sm text-muted-foreground">Remind me to drink water regularly (interval or custom scheduled times).</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        const newWater = { id: crypto.randomUUID(), name: 'Drink Water', time: '10:00' };
                        setCustomWaterReminders([...customWaterReminders, newWater]);
                      }}
                    >
                      + Add Time
                    </Button>
                    <Switch 
                      checked={wellnessReminders.water} 
                      onCheckedChange={(c) => setWellnessReminders(prev => ({...prev, water: c}))} 
                    />
                  </div>
                </div>
                {wellnessReminders.water && (
                  <div className="pl-14 space-y-3">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium">Interval:</span>
                      <select 
                        className="flex h-9 w-[130px] items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                        value={intervals.water}
                        onChange={(e) => {
                          const val = e.target.value;
                          setIntervals(prev => ({...prev, water: val}));
                          localStorage.setItem('actionpilot_water_interval', val);
                        }}
                      >
                        <option value="30">Every 30 min</option>
                        <option value="60">Every 1 hour</option>
                        <option value="120">Every 2 hours</option>
                        <option value="180">Every 3 hours</option>
                      </select>
                    </div>
                    <div className="bg-primary/5 p-3 rounded-md text-xs border border-primary/10">
                      <p className="font-medium flex items-center gap-1"><Zap className="w-3 h-3 text-primary" /> AI Recommendation</p>
                      <p className="text-muted-foreground mt-1">For optimal hydration while working, it's recommended to drink 8 glasses (about 2 liters) of water daily. An interval of <strong>1-2 hours</strong> is ideal for most people.</p>
                    </div>
                  </div>
                )}
                {customWaterReminders.length > 0 && (
                  <div className="pl-14 border-t pt-4 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Scheduled Hydration Times</p>
                    {customWaterReminders.map(water => (
                      <div key={water.id} className="flex items-center gap-3">
                        <input 
                          type="text" 
                          className="flex h-9 w-[180px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                          value={water.name}
                          onChange={(e) => {
                            setCustomWaterReminders(prev => prev.map(w => w.id === water.id ? { ...w, name: e.target.value } : w));
                          }}
                          placeholder="Reminder name (e.g. Drink glass)"
                        />
                        <input 
                          type="time" 
                          className="flex h-9 w-[120px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                          value={water.time}
                          onChange={(e) => {
                            setCustomWaterReminders(prev => prev.map(w => w.id === water.id ? { ...w, time: e.target.value } : w));
                          }}
                        />
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-destructive hover:text-destructive/90"
                          onClick={() => {
                            setCustomWaterReminders(prev => prev.filter(w => w.id !== water.id));
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-4 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                      <span className="text-red-500 text-lg">💊</span>
                    </div>
                    <div>
                      <p className="font-medium">Medication Reminders</p>
                      <p className="text-sm text-muted-foreground">Schedule alerts for your specific medicines.</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const newMed = { id: crypto.randomUUID(), name: 'New Medicine', time: '09:00' };
                      setMedications([...medications, newMed]);
                    }}
                  >
                    + Add
                  </Button>
                </div>
                
                {medications.length > 0 && (
                  <div className="pl-14 space-y-3">
                    {medications.map(med => (
                      <div key={med.id} className="flex items-center gap-3">
                        <input 
                          type="text" 
                          className="flex h-9 w-[180px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                          value={med.name}
                          onChange={(e) => {
                            setMedications(prev => prev.map(m => m.id === med.id ? { ...m, name: e.target.value } : m));
                          }}
                          placeholder="Medicine name"
                        />
                        <input 
                          type="time" 
                          className="flex h-9 w-[120px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                          value={med.time}
                          onChange={(e) => {
                            setMedications(prev => prev.map(m => m.id === med.id ? { ...m, time: e.target.value } : m));
                          }}
                        />
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-destructive hover:text-destructive/90"
                          onClick={() => {
                            setMedications(prev => prev.filter(m => m.id !== med.id));
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-4 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <span className="text-green-500 text-lg">🧘</span>
                    </div>
                    <div>
                      <p className="font-medium">Posture & Stretching</p>
                      <p className="text-sm text-muted-foreground">Quick physical breaks to prevent fatigue (interval or custom scheduled times).</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        const newStretch = { id: crypto.randomUUID(), name: 'Stand up and Stretch', time: '11:00' };
                        setCustomStretchReminders([...customStretchReminders, newStretch]);
                      }}
                    >
                      + Add Time
                    </Button>
                    <Switch 
                      checked={wellnessReminders.stretching} 
                      onCheckedChange={(c) => setWellnessReminders(prev => ({...prev, stretching: c}))} 
                    />
                  </div>
                </div>
                {wellnessReminders.stretching && (
                  <div className="pl-14 space-y-3">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium">Interval:</span>
                      <select 
                        className="flex h-9 w-[130px] items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                        value={intervals.stretch}
                        onChange={(e) => {
                          const val = e.target.value;
                          setIntervals(prev => ({...prev, stretch: val}));
                          localStorage.setItem('actionpilot_stretch_interval', val);
                        }}
                      >
                        <option value="30">Every 30 min</option>
                        <option value="60">Every 1 hour</option>
                        <option value="90">Every 1.5 hours</option>
                      </select>
                    </div>
                    <div className="bg-primary/5 p-3 rounded-md text-xs border border-primary/10">
                      <p className="font-medium flex items-center gap-1"><Zap className="w-3 h-3 text-primary" /> AI Recommendation</p>
                      <p className="text-muted-foreground mt-1">Prolonged sitting can cause muscle fatigue. Aim to stretch for 5 minutes every <strong>60 minutes</strong> to maintain blood flow and prevent repetitive strain injuries.</p>
                    </div>
                  </div>
                )}
                {customStretchReminders.length > 0 && (
                  <div className="pl-14 border-t pt-4 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Scheduled Stretch Times</p>
                    {customStretchReminders.map(stretch => (
                      <div key={stretch.id} className="flex items-center gap-3">
                        <input 
                          type="text" 
                          className="flex h-9 w-[180px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                          value={stretch.name}
                          onChange={(e) => {
                            setCustomStretchReminders(prev => prev.map(s => s.id === stretch.id ? { ...s, name: e.target.value } : s));
                          }}
                          placeholder="Stretch name (e.g. Neck stretch)"
                        />
                        <input 
                          type="time" 
                          className="flex h-9 w-[120px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                          value={stretch.time}
                          onChange={(e) => {
                            setCustomStretchReminders(prev => prev.map(s => s.id === stretch.id ? { ...s, time: e.target.value } : s));
                          }}
                        />
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-destructive hover:text-destructive/90"
                          onClick={() => {
                            setCustomStretchReminders(prev => prev.filter(s => s.id !== stretch.id));
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Important Dates & Events</CardTitle>
              <CardDescription>Never forget birthdays, anniversaries, or important yearly events. The AI coach will remind you.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-pink-500/10 flex items-center justify-center">
                      <span className="text-pink-500 text-lg">🎉</span>
                    </div>
                    <div>
                      <p className="font-medium">Tracked Events</p>
                      <p className="text-sm text-muted-foreground">Manage your saved dates.</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const newEvent = { id: crypto.randomUUID(), name: 'New Event', date: new Date().toISOString().split('T')[0], type: 'Birthday' };
                      setImportantEvents([...importantEvents, newEvent]);
                    }}
                  >
                    + Add
                  </Button>
                </div>
                
                {importantEvents.length > 0 && (
                  <div className="pl-14 space-y-3">
                    {importantEvents.map(evt => (
                      <div key={evt.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <select
                          className="flex h-9 w-[120px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                          value={evt.type}
                          onChange={(e) => {
                            setImportantEvents(prev => prev.map(m => m.id === evt.id ? { ...m, type: e.target.value } : m));
                          }}
                        >
                          <option value="Birthday">Birthday</option>
                          <option value="Anniversary">Anniversary</option>
                          <option value="Other">Other</option>
                        </select>
                        <input 
                          type="text" 
                          className="flex h-9 w-full sm:w-[180px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                          value={evt.name}
                          onChange={(e) => {
                            setImportantEvents(prev => prev.map(m => m.id === evt.id ? { ...m, name: e.target.value } : m));
                          }}
                          placeholder="Name / Title"
                        />
                        <input 
                          type="date" 
                          className="flex h-9 w-[150px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                          value={evt.date}
                          onChange={(e) => {
                            setImportantEvents(prev => prev.map(m => m.id === evt.id ? { ...m, date: e.target.value } : m));
                          }}
                        />
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-destructive hover:text-destructive/90 w-full sm:w-auto mt-2 sm:mt-0"
                          onClick={() => {
                            setImportantEvents(prev => prev.filter(m => m.id !== evt.id));
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {importantEvents.length === 0 && (
                   <div className="pl-14 text-sm text-muted-foreground italic">
                     No events added yet. Add one above.
                   </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!connectingPlatform} onOpenChange={(open) => !open && !isSimulatingAuth && setConnectingPlatform(null)}>
        <DialogContent className="sm:max-w-md bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              {connectingPlatform === 'instagram' && <Instagram className="w-5 h-5 text-pink-500" />}
              {connectingPlatform === 'whatsapp' && <MessageSquare className="w-5 h-5 text-green-500" />}
              {connectingPlatform === 'sms' && <Phone className="w-5 h-5 text-blue-500" />}
              {connectingPlatform === 'gmail' && <Mail className="w-5 h-5 text-red-500" />}
              Connect {connectingPlatform === 'sms' ? 'SMS' : connectingPlatform === 'gmail' ? 'Gmail' : connectingPlatform?.charAt(0).toUpperCase() + connectingPlatform?.slice(1)}
            </DialogTitle>
            <DialogDescription>
              Select an authentication method to link your account securely.
            </DialogDescription>
          </DialogHeader>

          {/* Connection Method Tabs */}
          <div className="grid grid-cols-3 gap-1 bg-muted p-1 rounded-lg text-xs font-semibold">
            <button
              type="button"
              className={`py-1.5 px-2 rounded-md transition-all ${authMethod === 'sandbox' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setAuthMethod('sandbox')}
            >
              Sandbox Mode
            </button>
            <button
              type="button"
              className={`py-1.5 px-2 rounded-md transition-all ${authMethod === 'credentials' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setAuthMethod('credentials')}
            >
              API Credentials
            </button>
            <button
              type="button"
              className={`py-1.5 px-2 rounded-md transition-all ${authMethod === 'oauth' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setAuthMethod('oauth')}
            >
              Official OAuth
            </button>
          </div>

          <div className="py-2 space-y-4 text-sm">
            {authMethod === 'sandbox' && (
              <div className="space-y-3">
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-3 rounded-lg text-xs space-y-1">
                  <p className="font-bold">✓ Recommended & Instant Connection</p>
                  <p className="opacity-90">Bypasses external OAuth blocks, Google/Meta Verification delays, and requires no API keys.</p>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg border border-border">
                  <div className="text-xs font-bold mb-2 uppercase tracking-wider text-muted-foreground">Included Features:</div>
                  <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                    <li>Simulated real-time message receiver</li>
                    <li>Full support for triggers & automatic replies</li>
                    <li>Automatic wellness alerts & calendar syncing</li>
                  </ul>
                </div>
              </div>
            )}

            {authMethod === 'credentials' && (
              <div className="space-y-3">
                <div className="bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 p-3 rounded-lg text-xs">
                  <p className="font-bold">Developer Custom Credentials</p>
                  <p className="opacity-90">Paste your custom tokens, API keys, or developer application credentials.</p>
                </div>
                
                {connectingPlatform === 'gmail' && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Google App Password or Custom token</label>
                    <input 
                      type="password" 
                      placeholder="e.g. abcd efgh ijkl mnop"
                      value={customCreds.appPassword}
                      onChange={(e) => setCustomCreds(prev => ({ ...prev, appPassword: e.target.value }))}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                    <p className="text-[10px] text-muted-foreground">Use a 16-character Google App Password from your Google Account settings to connect securely.</p>
                  </div>
                )}

                {connectingPlatform === 'instagram' && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Instagram Page Access Token</label>
                    <input 
                      type="password" 
                      placeholder="EAAGb..."
                      value={customCreds.token}
                      onChange={(e) => setCustomCreds(prev => ({ ...prev, token: e.target.value }))}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                )}

                {connectingPlatform === 'whatsapp' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">WhatsApp Phone Number ID</label>
                      <input 
                        type="text" 
                        placeholder="108xxxxxxxxxxxx"
                        value={customCreds.phoneId}
                        onChange={(e) => setCustomCreds(prev => ({ ...prev, phoneId: e.target.value }))}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">System User Access Token</label>
                      <input 
                        type="password" 
                        placeholder="EAAGb..."
                        value={customCreds.token}
                        onChange={(e) => setCustomCreds(prev => ({ ...prev, token: e.target.value }))}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                    </div>
                  </div>
                )}

                {connectingPlatform === 'sms' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Twilio Account SID</label>
                      <input 
                        type="text" 
                        placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        value={customCreds.twilioSid}
                        onChange={(e) => setCustomCreds(prev => ({ ...prev, twilioSid: e.target.value }))}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Twilio Auth Token</label>
                      <input 
                        type="password" 
                        placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        value={customCreds.twilioToken}
                        onChange={(e) => setCustomCreds(prev => ({ ...prev, twilioToken: e.target.value }))}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {authMethod === 'oauth' && (
              <div className="space-y-3">
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 p-3 rounded-lg text-xs space-y-1">
                  <p className="font-bold">⚠️ Google/Meta Verification Alert</p>
                  <p className="opacity-90">If the app is unverified by Google/Meta or you get a <b>403 Access Denied</b> screen, you must be added as an approved developer tester. Please use <b>Sandbox Mode</b> instead to instantly connect without issues.</p>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg border border-border">
                  <div className="text-xs font-bold mb-2 uppercase tracking-wider text-muted-foreground">Permissions Requested:</div>
                  <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                    <li>Read notifications, profile data and stream chats</li>
                    <li>Send messages and trigger reply templates</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setConnectingPlatform(null)} disabled={isSimulatingAuth} size="sm" className="px-4">
              Cancel
            </Button>
            <Button 
              onClick={confirmConnection} 
              disabled={isSimulatingAuth} 
              size="sm"
              className={`px-4 gap-2 ${
                authMethod === 'sandbox' 
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                  : authMethod === 'oauth' && (connectingPlatform === 'instagram' || connectingPlatform === 'whatsapp')
                    ? 'bg-[#1877F2] hover:bg-[#1877F2]/90 text-white'
                    : 'bg-primary text-primary-foreground'
              }`}
            >
              {isSimulatingAuth ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Connecting...
                </>
              ) : (
                authMethod === 'sandbox' 
                  ? 'Link Sandbox Account' 
                  : authMethod === 'credentials' 
                    ? 'Save & Authenticate' 
                    : connectingPlatform === 'gmail' 
                      ? 'Continue with Google' 
                      : 'Continue with Facebook'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
