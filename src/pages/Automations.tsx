import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { MessageSquare, Bot, Play, Settings2, Plus, Volume2, VolumeX, Instagram, Phone, Trash2, CalendarHeart, Zap, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router';

interface SocialMessage {
  id: string;
  platform: 'WhatsApp' | 'Instagram' | 'SMS';
  sender: string;
  content: string;
  time: string;
  isRead: boolean;
}

interface AutomationRule {
  id: string;
  name: string;
  triggerEvent: string;
  messageTemplate: string;
  platform: string;
  isActive: boolean;
  isSkipped?: boolean;
}

const initialMessages: SocialMessage[] = [
  { id: '1', platform: 'WhatsApp', sender: 'Mom', content: 'Are you coming home for dinner?', time: '09:00 AM', isRead: false },
  { id: '2', platform: 'Instagram', sender: 'alex_dev', content: 'Hey, checked out your new project. Looks awesome!', time: '10:30 AM', isRead: false },
  { id: '3', platform: 'SMS', sender: '+1 555-0198', content: 'Your appointment is confirmed for tomorrow at 2 PM.', time: '11:15 AM', isRead: false },
];

const initialRules: AutomationRule[] = [
  { id: '1', name: 'Birthday Wishes', triggerEvent: 'Contact Birthday', messageTemplate: 'Happy Birthday! 🎉 Hope you have a wonderful day!', platform: 'WhatsApp', isActive: true },
];

export default function Automations() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<SocialMessage[]>(() => {
    const saved = localStorage.getItem('actionpilot_messages');
    return saved ? JSON.parse(saved) : initialMessages;
  });
  const [rules, setRules] = useState<AutomationRule[]>(() => {
    const saved = localStorage.getItem('actionpilot_rules');
    return saved ? JSON.parse(saved) : initialRules;
  });

  useEffect(() => {
    localStorage.setItem('actionpilot_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('actionpilot_rules', JSON.stringify(rules));
  }, [rules]);
  const [language, setLanguage] = useState('en-US');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayingRules, setIsPlayingRules] = useState(false);

  const [connections, setConnections] = useState({
    instagram: localStorage.getItem('actionpilot_connected_instagram') === 'true',
    whatsapp: localStorage.getItem('actionpilot_connected_whatsapp') === 'true',
    sms: localStorage.getItem('actionpilot_connected_sms') === 'true',
    gmail: localStorage.getItem('actionpilot_connected_gmail') === 'true' || localStorage.getItem('actionpilot_gmail_token') !== null
  });

  useEffect(() => {
    const checkConnections = () => {
      setConnections({
        instagram: localStorage.getItem('actionpilot_connected_instagram') === 'true',
        whatsapp: localStorage.getItem('actionpilot_connected_whatsapp') === 'true',
        sms: localStorage.getItem('actionpilot_connected_sms') === 'true',
        gmail: localStorage.getItem('actionpilot_connected_gmail') === 'true' || localStorage.getItem('actionpilot_gmail_token') !== null
      });
    };
    
    window.addEventListener('connections_updated', checkConnections);
    return () => {
      window.removeEventListener('connections_updated', checkConnections);
    };
  }, []);

  const [isNewRuleModalOpen, setIsNewRuleModalOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [newRule, setNewRule] = useState<Partial<AutomationRule>>({
    name: '',
    triggerEvent: '',
    messageTemplate: '',
    platform: 'WhatsApp'
  });

  // Stop playing if component unmounts
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const playRules = () => {
    if (isPlayingRules) {
      window.speechSynthesis.cancel();
      setIsPlayingRules(false);
      return;
    }

    const activeRules = rules.filter(r => r.isActive);
    if (activeRules.length === 0) {
      toast('No active automation rules to read.');
      return;
    }

    setIsPlayingRules(true);
    let fullText = `You have ${activeRules.length} active automation rule${activeRules.length > 1 ? 's' : ''}. `;
    
    activeRules.forEach(rule => {
      fullText += `Rule: ${rule.name}. It triggers on ${rule.triggerEvent} for ${rule.platform}. The message template is: ${rule.messageTemplate}. `;
    });

    const utterance = new SpeechSynthesisUtterance(fullText);
    utterance.lang = language;
    
    utterance.onend = () => setIsPlayingRules(false);
    utterance.onerror = () => setIsPlayingRules(false);

    window.speechSynthesis.speak(utterance);
  };

  const playMessages = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    const unreadMessages = messages.filter(m => !m.isRead);
    if (unreadMessages.length === 0) {
      toast('No new messages to read.');
      return;
    }

    setIsPlaying(true);
    let fullText = `You have ${unreadMessages.length} new messages. `;
    
    unreadMessages.forEach(msg => {
      fullText += `Message from ${msg.sender} on ${msg.platform}: ${msg.content}. `;
    });

    const utterance = new SpeechSynthesisUtterance(fullText);
    utterance.lang = language;
    
    utterance.onend = () => {
      setIsPlaying(false);
      setMessages(messages.map(m => ({ ...m, isRead: true })));
    };

    utterance.onerror = () => {
      setIsPlaying(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const playSingleMessage = (msgId: string) => {
    window.speechSynthesis.cancel();
    
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;

    const text = `Message from ${msg.sender} on ${msg.platform}: ${msg.content}.`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;

    utterance.onend = () => {
      if (!msg.isRead) {
        setMessages(messages.map(m => m.id === msgId ? { ...m, isRead: true } : m));
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  const simulateIncomingMessage = () => {
    const alertsEnabled = localStorage.getItem('actionpilot_voice_alerts') === 'true';
    if (!alertsEnabled) {
      toast('Voice alerts are disabled in Settings.', { icon: '🔇' });
      return;
    }

    const newId = Date.now().toString();
    const newMsg: SocialMessage = {
      id: newId,
      platform: 'WhatsApp',
      sender: 'Alice',
      content: 'Hey, are we still meeting at 3 PM?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isRead: false
    };

    setMessages(prev => [newMsg, ...prev]);

    const text = `New notification on ${newMsg.platform} from ${newMsg.sender}: ${newMsg.content}`;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    
    toast(`Incoming message from ${newMsg.sender}!`);
    window.speechSynthesis.speak(utterance);
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'WhatsApp': return <MessageSquare className="w-4 h-4 text-green-500" />;
      case 'Instagram': return <Instagram className="w-4 h-4 text-pink-500" />;
      case 'SMS': return <Phone className="w-4 h-4 text-blue-500" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  const toggleRule = (id: string) => {
    setRules(rules.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r));
  };

  const handleEditRuleClick = (rule: AutomationRule) => {
    setEditingRuleId(rule.id);
    setNewRule({
      name: rule.name,
      triggerEvent: rule.triggerEvent,
      messageTemplate: rule.messageTemplate,
      platform: rule.platform
    });
    setIsNewRuleModalOpen(true);
  };

  const handleDeleteRule = (id: string) => {
    setRules(rules.filter(r => r.id !== id));
    toast.success('Automation rule deleted');
  };

  const toggleSkipRule = (id: string) => {
    setRules(rules.map(r => {
      if (r.id === id) {
        const nextSkipped = !r.isSkipped;
        toast.success(nextSkipped ? `Skipped next trigger for "${r.name}"` : `Restored trigger for "${r.name}"`);
        return { ...r, isSkipped: nextSkipped };
      }
      return r;
    }));
  };

  const handleSaveRule = () => {
    if (!newRule.name || !newRule.triggerEvent || !newRule.messageTemplate) {
      toast.error('Please fill all required fields');
      return;
    }
    if (editingRuleId) {
      setRules(rules.map(r => r.id === editingRuleId ? {
        ...r,
        name: newRule.name!,
        triggerEvent: newRule.triggerEvent!,
        messageTemplate: newRule.messageTemplate!,
        platform: newRule.platform!
      } : r));
      toast.success('Automation rule updated');
      setEditingRuleId(null);
    } else {
      const rule: AutomationRule = {
        id: Date.now().toString(),
        name: newRule.name!,
        triggerEvent: newRule.triggerEvent!,
        messageTemplate: newRule.messageTemplate!,
        platform: newRule.platform!,
        isActive: true,
        isSkipped: false
      };
      setRules([...rules, rule]);
      toast.success('Automation rule added');
    }
    setIsNewRuleModalOpen(false);
    setNewRule({ name: '', triggerEvent: '', messageTemplate: '', platform: 'WhatsApp' });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Social Automations</h1>
          <p className="text-muted-foreground mt-1">Manage your connected accounts, auto-replies, and daily voice summaries.</p>
        </div>
      </div>

      {/* AI Screen Controller Automation Card */}
      <Card className="border-indigo-500/30 bg-gradient-to-r from-indigo-500/5 via-transparent to-transparent shadow-md overflow-hidden relative">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-indigo-500/5 to-transparent pointer-events-none" />
        <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                🎙️ AI Smart Assistant
              </span>
            </div>
            <h3 className="text-xl font-bold text-foreground">ActionPilot AI Copilot</h3>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Initialize ActionPilot AI, the advanced voice & text analysis assistant. Speak or type commands naturally, let Gemini extract tasks or medication logs, and live-edit or confirm structured actions directly into your scheduler.
            </p>
          </div>
          <Button 
            onClick={() => window.dispatchEvent(new Event('open-agent-hud'))}
            className="shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/20 gap-2 px-5"
          >
            <Sparkles className="w-4 h-4" />
            🚀 Launch ActionPilot AI Copilot
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Messages Section */}
        <Card className="flex flex-col border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Unified Inbox
              </CardTitle>
              <CardDescription>All your incoming social messages in one place.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={simulateIncomingMessage}
                className="gap-2 hidden sm:flex"
                title="Test Incoming Alert"
              >
                <Bot className="w-4 h-4 text-green-500" />
                Test Alert
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-4">
            <div className="flex items-center gap-3 p-4 bg-secondary/50 rounded-lg border border-border/50">
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-[180px] bg-background">
                  <SelectValue placeholder="Voice Language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en-US">English (US)</SelectItem>
                  <SelectItem value="en-GB">English (UK)</SelectItem>
                  <SelectItem value="hi-IN">Hindi (India)</SelectItem>
                  <SelectItem value="es-ES">Spanish</SelectItem>
                  <SelectItem value="fr-FR">French</SelectItem>
                </SelectContent>
              </Select>
              
              <Button 
                onClick={playMessages} 
                variant={isPlaying ? "destructive" : "default"}
                className="flex-1 gap-2"
              >
                {isPlaying ? (
                  <>
                    <Volume2 className="w-4 h-4 animate-pulse" /> Stop Voice Summary
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" /> Listen to Unread
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-3 mt-4">
              {messages.length === 0 ? (
                <div className="text-center p-8 border rounded-lg bg-secondary/20">
                  <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <h3 className="font-medium">No messages yet</h3>
                  <p className="text-sm text-muted-foreground mt-1">Connect your social accounts in Profile Settings to see incoming messages.</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('/settings?tab=connections')}>Go to Settings</Button>
                </div>
              ) : (
                messages.map(msg => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-lg border transition-colors ${msg.isRead ? 'bg-background border-border/40' : 'bg-primary/5 border-primary/20'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2 font-medium">
                        {getPlatformIcon(msg.platform)}
                        {msg.sender}
                        {!msg.isRead && <span className="w-2 h-2 rounded-full bg-primary ml-1" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="w-6 h-6 text-muted-foreground hover:text-primary"
                          onClick={() => playSingleMessage(msg.id)}
                          title="Listen to message"
                        >
                          <Volume2 className="w-4 h-4" />
                        </Button>
                        <span className="text-xs text-muted-foreground">{msg.time}</span>
                      </div>
                    </div>
                    <p className="text-sm text-foreground/90">{msg.content}</p>
                  </motion.div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Automations Section */}
        <Card className="flex flex-col border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" />
                Auto-Replies & Triggers
              </CardTitle>
              <CardDescription>Set up automatic messages for birthdays, events, etc.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={playRules}
                className={`gap-2 ${isPlayingRules ? 'bg-primary/10 text-primary border-primary/50' : ''}`}
              >
                {isPlayingRules ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                <span className="hidden sm:inline">{isPlayingRules ? 'Stop' : 'Listen'}</span>
              </Button>
              <Dialog open={isNewRuleModalOpen} onOpenChange={(val) => {
                setIsNewRuleModalOpen(val);
                if (!val) {
                  setEditingRuleId(null);
                  setNewRule({ name: '', triggerEvent: '', messageTemplate: '', platform: 'WhatsApp' });
                }
              }}>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2"
                  onClick={() => {
                    setEditingRuleId(null);
                    setNewRule({ name: '', triggerEvent: '', messageTemplate: '', platform: 'WhatsApp' });
                    setIsNewRuleModalOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4" /> New Rule
                </Button>
                <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>{editingRuleId ? 'Edit Automation Rule' : 'Create Automation Rule'}</DialogTitle>
                  <DialogDescription>
                    {editingRuleId ? 'Modify your trigger and automated message template.' : 'Set up a new trigger to automatically send messages on your social platforms.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Rule Name</Label>
                    <Input 
                      id="name" 
                      placeholder="e.g. Birthday Wishes" 
                      value={newRule.name}
                      onChange={(e) => setNewRule({...newRule, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="trigger">Trigger Event</Label>
                    <Select value={newRule.triggerEvent} onValueChange={(val) => setNewRule({...newRule, triggerEvent: val})}>
                      <SelectTrigger id="trigger">
                        <SelectValue placeholder="Select a trigger event" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Contact Birthday">Contact Birthday</SelectItem>
                        <SelectItem value="Incoming Message Match">Incoming Message Match</SelectItem>
                        <SelectItem value="Scheduled Time">Scheduled Time</SelectItem>
                        <SelectItem value="Missed Call">Missed Call</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="platform">Platform</Label>
                    <Select value={newRule.platform} onValueChange={(val) => setNewRule({...newRule, platform: val})}>
                      <SelectTrigger id="platform">
                        <SelectValue placeholder="Select platform" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                        <SelectItem value="Instagram">Instagram</SelectItem>
                        <SelectItem value="SMS">SMS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="template">Message Template</Label>
                    <Textarea 
                      id="template"
                      placeholder="Type your automated message..." 
                      className="resize-none"
                      value={newRule.messageTemplate}
                      onChange={(e) => setNewRule({...newRule, messageTemplate: e.target.value})}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setIsNewRuleModalOpen(false);
                    setEditingRuleId(null);
                    setNewRule({ name: '', triggerEvent: '', messageTemplate: '', platform: 'WhatsApp' });
                  }}>Cancel</Button>
                  <Button onClick={handleSaveRule}>{editingRuleId ? 'Save Changes' : 'Save Rule'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {rules.length === 0 ? (
              <div className="text-center p-8 border rounded-lg bg-secondary/20">
                <Bot className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <h3 className="font-medium">No active rules</h3>
                <p className="text-sm text-muted-foreground mt-1">Create rules to auto-reply to messages, send birthday wishes, and more.</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setIsNewRuleModalOpen(true)}>Create Rule</Button>
              </div>
            ) : (
              rules.map(rule => (
                <div key={rule.id} className="p-4 rounded-lg border border-border bg-card shadow-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-semibold flex-wrap">
                        <CalendarHeart className="w-4 h-4 text-primary" />
                        {rule.name}
                        {rule.isSkipped && (
                          <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/20 px-1.5 py-0.5 rounded font-medium uppercase tracking-wider">
                            Skipped Next Trigger
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        Trigger: <span className="font-medium text-foreground">{rule.triggerEvent}</span>
                      </p>
                    </div>
                    <Switch 
                      checked={rule.isActive} 
                      onCheckedChange={() => toggleRule(rule.id)}
                    />
                  </div>
                  
                  <div className="bg-secondary/50 p-3 rounded-md text-sm text-foreground/80 border border-border/30 relative">
                    <span className="absolute -top-2.5 left-3 bg-background px-1 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Template</span>
                    {rule.messageTemplate}
                  </div>
                  
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      {getPlatformIcon(rule.platform)}
                      Sends via {rule.platform}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className={`h-8 text-xs font-medium ${rule.isSkipped ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-500/15' : 'text-muted-foreground hover:text-foreground'}`}
                        onClick={() => toggleSkipRule(rule.id)}
                      >
                        {rule.isSkipped ? 'Undo Skip' : 'Skip Next'}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => handleEditRuleClick(rule)}
                      >
                        Edit
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 text-xs text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                        onClick={() => handleDeleteRule(rule.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {Object.values(connections).some(Boolean) ? (
              <div className="p-6 rounded-lg border border-emerald-500/20 bg-emerald-500/5 flex flex-col sm:flex-row items-center justify-between text-center sm:text-left gap-4 mt-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <Zap className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Automations Active & Synced</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Your linked platforms: {' '}
                      <span className="font-medium text-foreground">
                        {[
                          connections.whatsapp && 'WhatsApp',
                          connections.instagram && 'Instagram',
                          connections.sms && 'SMS',
                          connections.gmail && 'Gmail'
                        ].filter(Boolean).join(', ')}
                      </span>
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="h-8 text-xs border-emerald-500/20 hover:bg-emerald-500/10" onClick={() => navigate('/settings?tab=connections')}>
                  Manage Connections
                </Button>
              </div>
            ) : (
              <div className="p-6 rounded-lg border border-dashed border-border flex flex-col items-center justify-center text-center space-y-2 mt-4 opacity-70">
                <Settings2 className="w-8 h-8 text-muted-foreground mb-1" />
                <h4 className="font-medium">Connect Accounts</h4>
                <p className="text-xs text-muted-foreground max-w-[200px]">Link Instagram, WhatsApp, or SMS in Settings to enable automations.</p>
                <Button variant="secondary" size="sm" className="mt-2" onClick={() => navigate('/settings?tab=connections')}>Go to Settings</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
