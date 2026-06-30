import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Mic, MicOff, Play, Pause, Square, Loader2, 
  Trash2, Edit3, Check, AlertCircle, Bot, Sparkles, 
  Plus, Calendar, Clock, Send, MessageSquare, Sliders, ChevronRight,
  Droplet, Activity, HelpCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiFetch } from '../lib/utils';

interface MessageLog {
  time: string;
  type: 'info' | 'success' | 'warn' | 'error' | 'ai';
  text: string;
}

export default function AgentHUD() {
  const [showAgentHUD, setShowAgentHUD] = useState(false);
  const [agentLogs, setAgentLogs] = useState<MessageLog[]>([]);
  const [agentPrompt, setAgentPrompt] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Voice capture state
  const [isListening, setIsListening] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // Parsed actions state
  const [detectedActions, setDetectedActions] = useState<any[]>([]);
  const [selectedActionIndex, setSelectedActionIndex] = useState<number>(0);
  const [isEditingAction, setIsEditingAction] = useState(false);

  // Speech Recognition Ref
  const recognitionRef = useRef<any>(null);
  const speechBufferRef = useRef<string>('');

  useEffect(() => {
    const handleOpenHUD = () => {
      setShowAgentHUD(true);
      setAgentLogs([
        { time: getTimestamp(), type: 'info', text: "Smart Task Assistant initialized." },
        { time: getTimestamp(), type: 'info', text: "Voice processor ready. Say or type a request (e.g. 'Add a high priority marketing task for tomorrow and a health check for Friday')." }
      ]);
      setDetectedActions([]);
      setSelectedActionIndex(0);
      setIsEditingAction(false);
      setAgentPrompt('');
    };

    window.addEventListener('open-agent-hud', handleOpenHUD);
    return () => {
      window.removeEventListener('open-agent-hud', handleOpenHUD);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, []);

  const getTimestamp = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const addLog = (text: string, type: MessageLog['type'] = 'info') => {
    setAgentLogs(prev => [...prev, { time: getTimestamp(), type, text }]);
  };

  const speakResponse = (text: string) => {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.pitch = 1.0;
      utterance.rate = 1.02;
      window.speechSynthesis.speak(utterance);
    } catch (e) {}
  };

  const checkSafetyViolation = (text: string): boolean => {
    const dangerousWords = [
      'weapon', 'bomb', 'gun', 'terrorist', 'terrorism', 'murder', 'kill', 
      'suicide', 'assassinate', 'arms purchase', 'smuggle weapons', 'make a bomb',
      'nuclear', 'explosive', 'terrorists', 'hijack', 'attack plan'
    ];
    const normalized = text.toLowerCase();
    return dangerousWords.some(word => normalized.includes(word));
  };

  // Start Voice Capture
  const startVoiceCapture = () => {
    // @ts-ignore
    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech Recognition is not supported in your browser.");
      return;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch(e) {}
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onstart = () => {
      setIsListening(true);
      setIsPaused(false);
      addLog("Voice recording active. Speak naturally...", "info");
    };

    rec.onresult = (event: any) => {
      if (isPaused) return;

      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const completeText = (speechBufferRef.current + ' ' + finalTranscript + ' ' + interimTranscript).trim();
      setAgentPrompt(completeText);
    };

    rec.onerror = (e: any) => {
      console.error("Speech error", e);
      if (e.error === 'not-allowed') {
        addLog("Microphone access is blocked or denied. Please check your browser permission settings or open the app in a new tab.", "error");
        toast.error("Microphone access blocked. Please check browser settings or click 'Open in new tab' to grant mic permission.", { duration: 6000 });
      } else if (e.error !== 'no-speech') {
        addLog(`Voice Error: ${e.error}. Switch to keyboard mode if needed.`, "warn");
      }
    };

    rec.onend = () => {
      setIsListening(false);
    };

    speechBufferRef.current = agentPrompt;
    recognitionRef.current = rec;
    rec.start();
  };

  // Pause voice capture
  const pauseVoiceCapture = () => {
    if (!isListening) return;
    setIsPaused(true);
    addLog("Voice recording paused. Press Resume to continue.", "warn");
    try {
      recognitionRef.current.stop();
    } catch(e) {}
  };

  // Resume voice capture
  const resumeVoiceCapture = () => {
    setIsPaused(false);
    speechBufferRef.current = agentPrompt;
    startVoiceCapture();
  };

  // Stop/Complete voice capture
  const stopVoiceCapture = () => {
    setIsListening(false);
    setIsPaused(false);
    addLog("Voice recording finished. Processing command...", "success");
    try {
      recognitionRef.current.stop();
    } catch(e) {}
    
    // Trigger analysis immediately on complete
    setTimeout(() => {
      handleAnalyzeCommand();
    }, 400);
  };

  // Trigger analysis on prompt
  const handleAnalyzeCommand = async () => {
    const promptText = agentPrompt.trim();
    if (!promptText) {
      toast.error("Please enter or record a task instruction.");
      return;
    }

    if (checkSafetyViolation(promptText)) {
      addLog("Security block: Prompt violates content safety guidelines.", "error");
      toast.error("Task analysis blocked for safety reasons.");
      speakResponse("I can only help with safe and supportive tasks. Let's discuss a regular daily plan instead.");
      return;
    }

    // Stop listening if active
    if (isListening) {
      try { recognitionRef.current.stop(); } catch(e) {}
      setIsListening(false);
    }

    setIsAnalyzing(true);
    addLog(`Analyzing request: "${promptText}"`, "ai");

    try {
      const res = await apiFetch('/api/ai/agent-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          currentDate: new Date().toISOString()
        })
      });

      if (!res.ok) throw new Error("Failed parsing task");
      const data = await res.json();

      const actionsList = data.actions || [];

      if (actionsList.length === 0 || actionsList[0].actionType === 'safety_violation' || actionsList[0].actionType === 'unknown') {
        addLog("Analysis returned empty or unsupported task structure.", "warn");
        toast.error("Could not extract any valid tasks. Try stating clearly: 'Do laundry tomorrow and call Mom on Friday'.");
        setIsAnalyzing(false);
        return;
      }

      setDetectedActions(actionsList);
      setSelectedActionIndex(0);
      setIsEditingAction(false);

      addLog(`Structured ${actionsList.length} action(s) extracted successfully!`, "success");
      speakResponse(`ActionPilot AI has analyzed your instruction and successfully extracted ${actionsList.length} separate action item(s) with their correct dates. Please review and customize them in the list!`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to analyze task instructions.");
      addLog("Analysis pipeline failed. Check connection.", "error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Confirm and Save all remaining actions in list separately
  const handleSaveAllActions = () => {
    if (detectedActions.length === 0) return;

    try {
      let createdTasksCount = 0;
      let createdWaterCount = 0;
      let createdMedsCount = 0;
      let createdSmsCount = 0;

      // Read current state from local storage
      let currentTasks = [];
      const savedTasks = localStorage.getItem('actionpilot_tasks');
      if (savedTasks) {
        try { currentTasks = JSON.parse(savedTasks); } catch(e) {}
      }

      let currentWater = [];
      const savedWater = localStorage.getItem('actionpilot_custom_water_reminders');
      if (savedWater) {
        try { currentWater = JSON.parse(savedWater); } catch(e) {}
      }

      let currentMeds = [];
      const savedMeds = localStorage.getItem('actionpilot_medications');
      if (savedMeds) {
        try { currentMeds = JSON.parse(savedMeds); } catch(e) {}
      }

      let currentMsgs = [];
      const savedMsgs = localStorage.getItem('actionpilot_messages');
      if (savedMsgs) {
        try { currentMsgs = JSON.parse(savedMsgs); } catch(e) {}
      }

      // Loop through all remaining action items and save separately
      for (const action of detectedActions) {
        const { actionType, payload } = action;

        if (actionType === 'create_task') {
          const newTask = {
            id: crypto.randomUUID(),
            userId: 'current-user',
            title: payload.title || 'New Task',
            description: payload.description || 'Created via ActionPilot AI',
            priority: payload.priority || 'Medium',
            recurring: payload.recurring || 'None',
            category: payload.category || 'General',
            status: 'Pending',
            dueDate: payload.dueDate || new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
            estimatedMinutes: Number(payload.estimatedMinutes) || 30,
            isAiGenerated: true,
            subtasks: []
          };
          currentTasks.push(newTask);
          createdTasksCount++;

        } else if (actionType === 'water_reminder') {
          const newReminder = {
            id: crypto.randomUUID(),
            name: payload.name || 'Drink water',
            time: payload.time || '15:00'
          };
          currentWater.push(newReminder);
          createdWaterCount++;

        } else if (actionType === 'medication') {
          const newMed = {
            id: crypto.randomUUID(),
            name: payload.name || 'Medication',
            time: payload.time || '08:00',
            dose: payload.dose || '1 pill'
          };
          currentMeds.push(newMed);
          createdMedsCount++;

        } else if (actionType === 'send_sms') {
          const newMsg = {
            id: crypto.randomUUID(),
            platform: 'SMS' as const,
            sender: payload.sender || 'Friend',
            content: payload.content || '',
            time: payload.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isRead: true
          };
          currentMsgs.push(newMsg);
          createdSmsCount++;
        }
      }

      // Save arrays back to local storage if items were added
      if (createdTasksCount > 0) {
        localStorage.setItem('actionpilot_tasks', JSON.stringify(currentTasks));
        window.dispatchEvent(new Event('tasks_updated'));
      }
      if (createdWaterCount > 0) {
        localStorage.setItem('actionpilot_custom_water_reminders', JSON.stringify(currentWater));
      }
      if (createdMedsCount > 0) {
        localStorage.setItem('actionpilot_medications', JSON.stringify(currentMeds));
      }
      if (createdSmsCount > 0) {
        localStorage.setItem('actionpilot_messages', JSON.stringify(currentMsgs));
      }

      if (createdWaterCount > 0 || createdMedsCount > 0 || createdSmsCount > 0) {
        window.dispatchEvent(new Event('connections_updated'));
      }

      const totalCreated = createdTasksCount + createdWaterCount + createdMedsCount + createdSmsCount;
      toast.success(`Successfully saved ${totalCreated} action(s) individually!`);
      addLog(`Synchronized ${totalCreated} action(s) as separate items with their respective dates.`, "success");
      speakResponse(`I have added ${totalCreated} items separately to your schedule.`);

      setDetectedActions([]);
      setAgentPrompt('');
      setIsEditingAction(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to register actions.");
    }
  };

  // Discard / Delete all actions
  const handleDiscardAllActions = () => {
    setDetectedActions([]);
    setIsEditingAction(false);
    addLog("Parsed tasks discarded by user.", "warn");
    toast.error("Compilation discarded.");
    speakResponse("Actions discarded.");
  };

  // Delete a specific action from the list
  const handleDeleteSpecificAction = (indexToDelete: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Stop selection trigger
    setDetectedActions(prev => {
      const updated = prev.filter((_, idx) => idx !== indexToDelete);
      
      // Fix selected index if it is now out of bounds
      if (selectedActionIndex >= updated.length) {
        setSelectedActionIndex(Math.max(0, updated.length - 1));
      }
      return updated;
    });
    toast.success("Action removed from compilation.");
  };

  const updatePayloadField = (key: string, value: any) => {
    setDetectedActions(prev => {
      const updated = [...prev];
      if (updated[selectedActionIndex]) {
        updated[selectedActionIndex] = {
          ...updated[selectedActionIndex],
          payload: {
            ...updated[selectedActionIndex].payload,
            [key]: value
          }
        };
      }
      return updated;
    });
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'create_task': return <Calendar className="w-4 h-4 text-emerald-400" />;
      case 'water_reminder': return <Droplet className="w-4 h-4 text-cyan-400" />;
      case 'medication': return <Activity className="w-4 h-4 text-rose-400" />;
      case 'send_sms': return <MessageSquare className="w-4 h-4 text-indigo-400" />;
      default: return <HelpCircle className="w-4 h-4 text-zinc-400" />;
    }
  };

  const getActionTitle = (action: any) => {
    const { actionType, payload } = action;
    switch (actionType) {
      case 'create_task': return payload.title || 'Untitled Task';
      case 'water_reminder': return payload.name || 'Drink water';
      case 'medication': return `Medication: ${payload.name || 'Medicine'}`;
      case 'send_sms': return `SMS to ${payload.sender || 'Recipient'}`;
      default: return 'Unknown Action';
    }
  };

  const getActionSubtitle = (action: any) => {
    const { actionType, payload } = action;
    switch (actionType) {
      case 'create_task': return `Due: ${payload.dueDate || 'Today'}`;
      case 'water_reminder': return `Time: ${payload.time || '15:00'}`;
      case 'medication': return `Time: ${payload.time || '08:00'} (${payload.dose || '1 pill'})`;
      case 'send_sms': return `Text: "${payload.content ? payload.content.substring(0, 20) + '...' : 'empty'}"`;
      default: return '';
    }
  };

  const currentSelectedAction = detectedActions[selectedActionIndex];

  return (
    <AnimatePresence>
      {showAgentHUD && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-background/95 backdrop-blur-md z-[9999] flex items-center justify-center p-4 select-none"
        >
          {/* Futuristic ambient grid */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none opacity-40"></div>
          
          <motion.div
            initial={{ scale: 0.95, y: 15 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 15 }}
            className="relative w-full max-w-6xl bg-zinc-950/85 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[640px] text-zinc-300"
          >
            {/* Main Header / Close Button */}
            <div className="absolute top-5 right-5 z-20">
              <button
                onClick={() => setShowAgentHUD(false)}
                className="p-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-full text-zinc-400 hover:text-white transition-all duration-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Left Column: Voice Processor & Live Logs */}
            <div className="w-full md:w-5/12 bg-zinc-950 border-r border-zinc-800 p-6 flex flex-col h-full overflow-hidden">
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-4 mb-4 shrink-0">
                <Bot className="w-5 h-5 text-indigo-400 animate-pulse" />
                <div>
                  <h3 className="font-bold text-sm tracking-tight text-white">ActionPilot AI Copilot</h3>
                  <p className="text-[10px] text-zinc-500">ActionPilot AI Audio & Task Engine</p>
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-emerald-500 animate-ping' : 'bg-indigo-500'}`}></span>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">
                    {isListening ? 'Capturing' : 'Standby'}
                  </span>
                </div>
              </div>

              {/* Visual Waveform State */}
              <div className="flex-1 flex flex-col items-center justify-center p-4 bg-zinc-900/40 rounded-2xl border border-zinc-900/60 relative overflow-hidden mb-4 shrink-0 h-44">
                <AnimatePresence mode="wait">
                  {isListening && !isPaused ? (
                    <div key="recording-wave" className="flex items-center justify-center gap-1.5 h-16">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((item) => (
                        <motion.div
                          key={item}
                          animate={{ height: [12, 48, 12] }}
                          transition={{
                            repeat: Infinity,
                            duration: 0.8,
                            delay: item * 0.08,
                            ease: "easeInOut"
                          }}
                          className="w-1.5 bg-indigo-400 rounded-full"
                        />
                      ))}
                    </div>
                  ) : isListening && isPaused ? (
                    <div key="paused-state" className="flex flex-col items-center gap-2">
                      <Pause className="w-8 h-8 text-amber-500 animate-pulse" />
                      <span className="text-xs font-mono text-amber-500 uppercase tracking-widest font-bold">Recording Paused</span>
                    </div>
                  ) : isAnalyzing ? (
                    <div key="thinking-state" className="flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                      <span className="text-xs font-mono text-indigo-400 uppercase tracking-widest font-bold">Analyzing Speech...</span>
                    </div>
                  ) : (
                    <div key="idle-state" className="flex flex-col items-center gap-2 text-center">
                      <div className="p-3 rounded-full bg-zinc-900 border border-zinc-800">
                        <Mic className="w-6 h-6 text-zinc-400" />
                      </div>
                      <span className="text-xs text-zinc-400">Press Start Recording or Type Command</span>
                    </div>
                  )}
                </AnimatePresence>

                {/* Micro Recording Controls (Pause/Play, Stop) */}
                {isListening && (
                  <div className="absolute bottom-3 flex items-center gap-3 bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-full shadow-lg">
                    {isPaused ? (
                      <button
                        onClick={resumeVoiceCapture}
                        className="p-1 hover:bg-zinc-900 rounded text-amber-500 hover:text-amber-400 flex items-center gap-1.5 text-xs font-mono"
                        title="Resume Recording"
                      >
                        <Play className="w-3.5 h-3.5" /> Resume
                      </button>
                    ) : (
                      <button
                        onClick={pauseVoiceCapture}
                        className="p-1 hover:bg-zinc-900 rounded text-amber-500 hover:text-amber-400 flex items-center gap-1.5 text-xs font-mono"
                        title="Pause Recording"
                      >
                        <Pause className="w-3.5 h-3.5" /> Pause
                      </button>
                    )}
                    <span className="w-px h-3 bg-zinc-800"></span>
                    <button
                      onClick={stopVoiceCapture}
                      className="p-1 hover:bg-zinc-900 rounded text-rose-500 hover:text-rose-400 flex items-center gap-1.5 text-xs font-mono"
                      title="Stop & Analyze"
                    >
                      <Square className="w-3.5 h-3.5 fill-rose-500" /> Stop
                    </button>
                  </div>
                )}
              </div>

              {/* Activity Console Logs */}
              <div className="flex-1 flex flex-col min-h-0 bg-zinc-950 rounded-2xl p-4 border border-zinc-900 relative">
                <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-2 border-b border-zinc-900 pb-1 flex justify-between">
                  <span>System Console Log</span>
                  <span>UTC Mode</span>
                </div>
                <div className="flex-1 overflow-y-auto font-mono text-[11px] leading-relaxed space-y-2 pr-1 scrollbar-thin select-text">
                  {agentLogs.map((log, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <span className="text-zinc-600 shrink-0">[{log.time}]</span>
                      <span className={`
                        ${log.type === 'success' ? 'text-emerald-400' : ''}
                        ${log.type === 'warn' ? 'text-amber-400' : ''}
                        ${log.type === 'error' ? 'text-rose-400' : ''}
                        ${log.type === 'ai' ? 'text-indigo-400' : 'text-zinc-400'}
                      `}>
                        {log.text}
                      </span>
                    </div>
                  ))}
                  {isAnalyzing && (
                    <div className="flex gap-2 items-center text-indigo-400">
                      <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                      <span>Parsing with Gemini-2.5-Flash extraction engine...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: User prompt input & Confirmation screen */}
            <div className="flex-1 flex flex-col h-full bg-zinc-900/30 overflow-hidden">
              <AnimatePresence mode="wait">
                
                {/* STAGE A: Actions Confirmation/Review & Live List Editing */}
                {detectedActions.length > 0 ? (
                  <motion.div
                    key="confirmation-screen"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex-1 p-5 flex flex-col h-full overflow-hidden"
                  >
                    <div className="flex items-center gap-3 border-b border-zinc-800 pb-3 mb-3 shrink-0">
                      <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                        <Sparkles className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white tracking-tight text-sm">Review Extracted Actions</h4>
                        <p className="text-[11px] text-zinc-400">AI separated tasks as per date. Edit or remove items before adding</p>
                      </div>
                      <div className="ml-auto flex gap-1.5">
                        <button
                          onClick={() => setIsEditingAction(!isEditingAction)}
                          className={`p-1.5 rounded-lg border text-xs transition-all duration-200 flex items-center gap-1 ${isEditingAction ? 'bg-indigo-600 text-white border-indigo-500 font-bold' : 'bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 border-zinc-700/60'}`}
                          title="Toggle Edit Mode"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{isEditingAction ? 'Viewing' : 'Edit Details'}</span>
                        </button>
                        <button
                          onClick={handleDiscardAllActions}
                          className="p-1.5 bg-zinc-800/80 hover:bg-rose-950/40 border border-zinc-700/60 hover:border-rose-900/40 hover:text-rose-400 rounded-lg text-zinc-300 transition-colors"
                          title="Discard All"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* TWO-COLUMN SPLIT CONTAINER FOR PROFESSIONAL REVIEW */}
                    <div className="flex-1 flex gap-4 min-h-0 overflow-hidden pb-3">
                      
                      {/* Left Side: Actions Sidebar List (2/5) */}
                      <div className="w-5/12 bg-zinc-950/50 rounded-2xl border border-zinc-800 p-2.5 flex flex-col gap-2 overflow-y-auto scrollbar-thin">
                        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest px-1.5 mb-1 block">Extracted Items ({detectedActions.length})</span>
                        {detectedActions.map((action, idx) => {
                          const isSelected = idx === selectedActionIndex;
                          return (
                            <div
                              key={idx}
                              onClick={() => {
                                setSelectedActionIndex(idx);
                                setIsEditingAction(false);
                              }}
                              className={`group relative p-3 rounded-xl border text-left cursor-pointer transition-all duration-200 flex items-start gap-3 ${
                                isSelected 
                                  ? 'bg-indigo-500/10 border-indigo-500 shadow-sm shadow-indigo-500/5' 
                                  : 'bg-zinc-900/30 border-zinc-800/80 hover:bg-zinc-900/60 hover:border-zinc-700/60'
                              }`}
                            >
                              <div className="p-1.5 bg-zinc-900 rounded-lg border border-zinc-800 group-hover:border-zinc-700">
                                {getActionIcon(action.actionType)}
                              </div>
                              <div className="flex-1 min-w-0 pr-4">
                                <p className="text-xs font-bold text-white truncate">{getActionTitle(action)}</p>
                                <p className="text-[10px] text-zinc-400 font-mono mt-0.5 truncate">{getActionSubtitle(action)}</p>
                              </div>
                              
                              {/* Remove individual action button */}
                              <button
                                onClick={(e) => handleDeleteSpecificAction(idx, e)}
                                className="absolute top-2.5 right-2 p-1 hover:bg-zinc-800 text-zinc-500 hover:text-rose-400 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Remove item"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      {/* Right Side: Detail Form Editor for Currently Selected Action (3/5) */}
                      <div className="w-7/12 bg-zinc-950/40 border border-zinc-800/80 rounded-2xl p-4 flex flex-col min-h-0 overflow-y-auto scrollbar-thin select-text">
                        {currentSelectedAction ? (
                          <div className="space-y-3.5">
                            <div className="flex justify-between items-center pb-2 border-b border-zinc-900 shrink-0">
                              <span className="text-[9px] uppercase font-mono tracking-wider text-zinc-500 font-bold">Action Details</span>
                              <span className="px-2.5 py-0.5 text-[10px] font-bold font-mono tracking-wide rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 uppercase">
                                {currentSelectedAction.actionType.replace('_', ' ')}
                              </span>
                            </div>

                            {/* RENDER TASKS FIELD DETAILS */}
                            {currentSelectedAction.actionType === 'create_task' && (
                              <div className="space-y-3">
                                <div>
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Task Title</label>
                                  {isEditingAction ? (
                                    <input
                                      type="text"
                                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none font-medium text-white"
                                      value={currentSelectedAction.payload.title || ''}
                                      onChange={(e) => updatePayloadField('title', e.target.value)}
                                    />
                                  ) : (
                                    <p className="text-xs font-bold text-white bg-zinc-900/30 border border-zinc-900 p-2.5 rounded-xl">{currentSelectedAction.payload.title || 'Untitled Task'}</p>
                                  )}
                                </div>

                                <div>
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Description</label>
                                  {isEditingAction ? (
                                    <textarea
                                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none font-medium text-white h-16 resize-none"
                                      value={currentSelectedAction.payload.description || ''}
                                      onChange={(e) => updatePayloadField('description', e.target.value)}
                                    />
                                  ) : (
                                    <p className="text-[11px] text-zinc-400 bg-zinc-900/30 border border-zinc-900 p-2.5 rounded-xl whitespace-pre-wrap leading-relaxed">{currentSelectedAction.payload.description || 'No description provided.'}</p>
                                  )}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Priority</label>
                                    {isEditingAction ? (
                                      <select
                                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2 text-xs text-white"
                                        value={currentSelectedAction.payload.priority || 'Medium'}
                                        onChange={(e) => updatePayloadField('priority', e.target.value)}
                                      >
                                        <option value="High">High</option>
                                        <option value="Medium">Medium</option>
                                        <option value="Low">Low</option>
                                      </select>
                                    ) : (
                                      <span className={`inline-block px-2 py-0.5 text-[9px] font-bold rounded ${
                                        currentSelectedAction.payload.priority === 'High' ? 'bg-rose-500/10 text-rose-400' :
                                        currentSelectedAction.payload.priority === 'Low' ? 'bg-cyan-500/10 text-cyan-400' :
                                        'bg-amber-500/10 text-amber-400'
                                      }`}>
                                        {currentSelectedAction.payload.priority || 'Medium'}
                                      </span>
                                    )}
                                  </div>

                                  <div>
                                    <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Category</label>
                                    {isEditingAction ? (
                                      <select
                                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2 text-xs text-white"
                                        value={currentSelectedAction.payload.category || 'General'}
                                        onChange={(e) => updatePayloadField('category', e.target.value)}
                                      >
                                        <option value="Work">Work</option>
                                        <option value="Personal">Personal</option>
                                        <option value="Shopping">Shopping</option>
                                        <option value="Health">Health</option>
                                        <option value="Errands">Errands</option>
                                        <option value="General">General</option>
                                      </select>
                                    ) : (
                                      <span className="text-xs font-semibold text-indigo-400">{currentSelectedAction.payload.category || 'General'}</span>
                                    )}
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block mb-1 flex items-center gap-1"><Calendar className="w-3 h-3 text-zinc-500" /> Due Date</label>
                                    {isEditingAction ? (
                                      <input
                                        type="date"
                                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2 text-xs text-white font-mono"
                                        value={currentSelectedAction.payload.dueDate || ''}
                                        onChange={(e) => updatePayloadField('dueDate', e.target.value)}
                                      />
                                    ) : (
                                      <span className="text-xs text-zinc-300 font-mono font-medium">{currentSelectedAction.payload.dueDate || 'Today'}</span>
                                    )}
                                  </div>

                                  <div>
                                    <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block mb-1 flex items-center gap-1"><Clock className="w-3 h-3 text-zinc-500" /> Duration</label>
                                    {isEditingAction ? (
                                      <input
                                        type="number"
                                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2 text-xs text-white font-mono"
                                        value={currentSelectedAction.payload.estimatedMinutes || 30}
                                        onChange={(e) => updatePayloadField('estimatedMinutes', e.target.value)}
                                      />
                                    ) : (
                                      <span className="text-xs text-zinc-300 font-mono">{currentSelectedAction.payload.estimatedMinutes || 30} mins</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* WATER REMINDER FIELDS */}
                            {currentSelectedAction.actionType === 'water_reminder' && (
                              <div className="space-y-3">
                                <div>
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Reminder Name</label>
                                  {isEditingAction ? (
                                    <input
                                      type="text"
                                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none font-medium text-white"
                                      value={currentSelectedAction.payload.name || ''}
                                      onChange={(e) => updatePayloadField('name', e.target.value)}
                                    />
                                  ) : (
                                    <p className="text-xs font-bold text-white bg-zinc-900/30 border border-zinc-900 p-2.5 rounded-xl">{currentSelectedAction.payload.name || 'Drink water'}</p>
                                  )}
                                </div>

                                <div>
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Trigger Time</label>
                                  {isEditingAction ? (
                                    <input
                                      type="time"
                                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none font-medium text-white font-mono"
                                      value={currentSelectedAction.payload.time || ''}
                                      onChange={(e) => updatePayloadField('time', e.target.value)}
                                    />
                                  ) : (
                                    <p className="text-xs font-mono text-zinc-300 bg-zinc-900/30 border border-zinc-900 p-2.5 rounded-xl font-semibold">{currentSelectedAction.payload.time || '15:00'}</p>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* MEDICATION FIELDS */}
                            {currentSelectedAction.actionType === 'medication' && (
                              <div className="space-y-3">
                                <div>
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Medication Name</label>
                                  {isEditingAction ? (
                                    <input
                                      type="text"
                                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none font-medium text-white"
                                      value={currentSelectedAction.payload.name || ''}
                                      onChange={(e) => updatePayloadField('name', e.target.value)}
                                    />
                                  ) : (
                                    <p className="text-xs font-bold text-white bg-zinc-900/30 border border-zinc-900 p-2.5 rounded-xl">{currentSelectedAction.payload.name || 'Medicine'}</p>
                                  )}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Dose / Size</label>
                                    {isEditingAction ? (
                                      <input
                                        type="text"
                                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2 text-xs text-white"
                                        value={currentSelectedAction.payload.dose || ''}
                                        onChange={(e) => updatePayloadField('dose', e.target.value)}
                                      />
                                    ) : (
                                      <span className="text-xs text-zinc-300 font-medium bg-zinc-900/30 border border-zinc-900 p-2.5 rounded-xl block">{currentSelectedAction.payload.dose || '1 pill'}</span>
                                    )}
                                  </div>
                                  <div>
                                    <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Prescribed Time</label>
                                    {isEditingAction ? (
                                      <input
                                        type="time"
                                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2 text-xs text-white font-mono"
                                        value={currentSelectedAction.payload.time || ''}
                                        onChange={(e) => updatePayloadField('time', e.target.value)}
                                      />
                                    ) : (
                                      <span className="text-xs font-mono text-zinc-300 font-semibold bg-zinc-900/30 border border-zinc-900 p-2.5 rounded-xl block">{currentSelectedAction.payload.time || '08:00'}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* SEND SMS FIELDS */}
                            {currentSelectedAction.actionType === 'send_sms' && (
                              <div className="space-y-3">
                                <div>
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Recipient (Sender)</label>
                                  {isEditingAction ? (
                                    <input
                                      type="text"
                                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none font-medium text-white"
                                      value={currentSelectedAction.payload.sender || ''}
                                      onChange={(e) => updatePayloadField('sender', e.target.value)}
                                    />
                                  ) : (
                                    <p className="text-xs font-bold text-white bg-zinc-900/30 border border-zinc-900 p-2.5 rounded-xl">{currentSelectedAction.payload.sender || 'Mom'}</p>
                                  )}
                                </div>

                                <div>
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Message Content</label>
                                  {isEditingAction ? (
                                    <textarea
                                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none font-medium text-white h-16 resize-none"
                                      value={currentSelectedAction.payload.content || ''}
                                      onChange={(e) => updatePayloadField('content', e.target.value)}
                                    />
                                  ) : (
                                    <p className="text-[11px] text-zinc-400 bg-zinc-900/30 border border-zinc-900 p-2.5 rounded-xl whitespace-pre-wrap leading-relaxed">{currentSelectedAction.payload.content || 'Empty message body.'}</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 py-10">
                            <Bot className="w-8 h-8 opacity-20 mb-2" />
                            <span className="text-xs font-mono">No action selected</span>
                          </div>
                        )}
                      </div>

                    </div>

                    {/* Stage A Footers: Confirm actions button */}
                    <div className="pt-3 border-t border-zinc-800 shrink-0 flex gap-3">
                      <button
                        onClick={handleDiscardAllActions}
                        className="flex-1 py-3 bg-zinc-900 border border-zinc-800 hover:bg-rose-950/20 hover:border-rose-900/30 hover:text-rose-400 rounded-xl text-xs font-bold text-zinc-300 transition-all duration-200"
                      >
                        Discard Compilation
                      </button>
                      <button
                        onClick={handleSaveAllActions}
                        className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all duration-200 flex items-center justify-center gap-2"
                      >
                        <Check className="w-4 h-4" /> Save & Synchronize Separately
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  
                  // STAGE B: Standard Voice/Text prompt entry Screen
                  <motion.div
                    key="input-screen"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex-1 p-6 flex flex-col h-full overflow-hidden"
                  >
                    <div className="border-b border-zinc-800 pb-4 mb-4 shrink-0">
                      <h4 className="font-bold text-white tracking-tight">ActionPilot AI Assistant</h4>
                      <p className="text-xs text-zinc-400">Describe what you want to add or do, and ActionPilot AI will instantly schedule them separately</p>
                    </div>

                    {/* Quick suggestion Templates */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 shrink-0">
                      <button
                        onClick={() => setAgentPrompt("Do marketing review tomorrow with High priority, and prepare presentation for Friday with Work category")}
                        className="p-3 bg-zinc-900/30 border border-zinc-800/80 hover:border-indigo-500/30 rounded-xl text-left hover:bg-zinc-900/50 transition-all duration-200 animate-fade-in"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="text-[11px] font-bold text-white">Create 2 Separate Tasks</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 truncate">"Marketing review tomorrow, presentation on Friday"</p>
                      </button>

                      <button
                        onClick={() => setAgentPrompt("Remind me to drink water at 14:30 and take Vitamin D at 09:00")}
                        className="p-3 bg-zinc-900/30 border border-zinc-800/80 hover:border-indigo-500/30 rounded-xl text-left hover:bg-zinc-900/50 transition-all duration-200"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="text-[11px] font-bold text-white">Multiple Hydration & Health</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 truncate">"Drink water at 14:30 and take Vitamin D at 09:00"</p>
                      </button>

                      <button
                        onClick={() => setAgentPrompt("Add medication Vitamin C at 09:00 with 1 tablet, and do cardio exercise tomorrow")}
                        className="p-3 bg-zinc-900/30 border border-zinc-800/80 hover:border-indigo-500/30 rounded-xl text-left hover:bg-zinc-900/50 transition-all duration-200"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="text-[11px] font-bold text-white">Medication + Fitness Task</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 truncate">"Vitamin C at 09:00, and do cardio exercise tomorrow"</p>
                      </button>

                      <button
                        onClick={() => setAgentPrompt("Send message to Mom saying Call me back, and remind me to call Dad tomorrow")}
                        className="p-3 bg-zinc-900/30 border border-zinc-800/80 hover:border-indigo-500/30 rounded-xl text-left hover:bg-zinc-900/50 transition-all duration-200"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="text-[11px] font-bold text-white">SMS + Reminder Task</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 truncate">"Send message to Mom, call Dad tomorrow"</p>
                      </button>
                    </div>

                    {/* Prompt input field */}
                    <div className="flex-1 flex flex-col justify-end gap-4 min-h-0">
                      <div className="bg-zinc-950 rounded-2xl border border-zinc-800 flex flex-col p-4 flex-1">
                        <div className="text-[10px] font-mono uppercase text-zinc-500 mb-2">Live Text Entry / Voice transcript</div>
                        <textarea
                          placeholder="Speak via microphone, click suggestions, or type out instructions here..."
                          value={agentPrompt}
                          onChange={(e) => setAgentPrompt(e.target.value)}
                          className="flex-1 w-full bg-transparent border-0 focus:ring-0 p-0 text-sm focus:outline-none resize-none text-white font-medium"
                        />
                        
                        {/* Audio control button inside prompt frame */}
                        <div className="flex items-center justify-between border-t border-zinc-900 pt-3 mt-2 shrink-0">
                          {isListening ? (
                            <button
                              onClick={stopVoiceCapture}
                              className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/40 text-rose-400 rounded-xl text-xs font-mono font-bold transition-all duration-200 flex items-center gap-1.5 animate-pulse"
                            >
                              <MicOff className="w-3.5 h-3.5" /> Stop Capture
                            </button>
                          ) : (
                            <button
                              onClick={startVoiceCapture}
                              className="px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 hover:border-indigo-500/40 text-indigo-400 rounded-xl text-xs font-mono font-bold transition-all duration-200 flex items-center gap-1.5"
                            >
                              <Mic className="w-3.5 h-3.5" /> Start Voice Recording
                            </button>
                          )}

                          <span className="text-[10px] text-zinc-500 font-mono">Ready to process</span>
                        </div>
                      </div>

                      {/* Launch Button */}
                      <button
                        onClick={handleAnalyzeCommand}
                        disabled={isAnalyzing || !agentPrompt.trim()}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all duration-200 flex items-center justify-center gap-2 shrink-0"
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" /> Analyzing Instructions...
                          </>
                        ) : (
                          <>
                            Analyze & Build Tasks <ChevronRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
