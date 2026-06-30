import { useState, useRef, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { 
  Mic, 
  Upload, 
  Loader2, 
  Sparkles, 
  Plus, 
  Clock, 
  Target, 
  Trash2, 
  Send, 
  Bot, 
  User as UserIcon, 
  ListTodo,
  RefreshCw,
  X,
  Minus,
  PlusCircle,
  CheckSquare,
  Square
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { logActivity } from '../lib/activity';
import { apiFetch } from '../lib/utils';

interface TaskCreationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Subtask {
  id: string;
  title: string;
  estimatedMinutes: number;
}

interface TaskState {
  title: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
  category: string;
  recurring: 'None' | 'Daily' | 'Weekly' | 'Monthly';
  estimatedMinutes: number;
  dueDate: string;
  subtasks: Subtask[];
}

export default function TaskCreationModal({ open, onOpenChange }: TaskCreationModalProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hi! I'm your AI Executive Assistant. Describe your next task or project (e.g. 'I need to prepare for my math exam next Monday'), and I will help automate and schedule it for you!" }
  ]);
  const [input, setInput] = useState('');
  const [interimText, setInterimText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [taskState, setTaskState] = useState<TaskState | null>(null);
  const [pendingTasks, setPendingTasks] = useState<TaskState[]>([]);
  const [selectedSubtaskIds, setSelectedSubtaskIds] = useState<string[]>([]);
  const [autoSync, setAutoSync] = useState(true);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const getDueDate = () => {
    const prefilled = localStorage.getItem('actionpilot_prefilled_task_date');
    if (prefilled) {
      try {
        const d = new Date(prefilled);
        if (!isNaN(d.getTime())) {
          d.setHours(9, 0, 0, 0);
          return d.toISOString();
        }
      } catch (e) {}
    }
    return new Date().toISOString();
  };

  // Clear selections when the main task changes
  useEffect(() => {
    setSelectedSubtaskIds([]);
  }, [taskState?.title]);

  // Initialize Speech Recognition
  useEffect(() => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
          setInput(prev => prev + (prev ? ' ' : '') + finalTranscript);
        }
        setInterimText(interimTranscript);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
        setInterimText('');
      };
    }
  }, []);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle Reset when modal opens/closes
  useEffect(() => {
    if (open) {
      setMessages([
        { role: 'assistant', content: "Hi! I'm your AI Executive Assistant. Describe your next task or project (e.g. 'I need to prepare for my math exam next Monday'), and I will help automate and schedule it for you!" }
      ]);
      setTaskState(null);
      setPendingTasks([]);
      setSelectedSubtaskIds([]);
      setInput('');
      setInterimText('');
    } else {
      localStorage.removeItem('actionpilot_prefilled_task_date');
    }
  }, [open]);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.start();
        setIsRecording(true);
      } else {
        toast.error("Speech recognition not supported in this browser.");
      }
    }
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = customPrompt || input;
    if (!promptToSend.trim()) return;

    const userMessage: Message = { role: 'user', content: promptToSend };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setInterimText('');
    setIsAnalyzing(true);

    try {
      const selectedDateString = localStorage.getItem('actionpilot_prefilled_task_date') || new Date().toISOString();
      const res = await apiFetch('/api/ai/chat-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          currentTask: taskState,
          currentDate: new Date().toISOString(),
          selectedDate: selectedDateString
        })
      });
      
      const text = await res.text();
      let data;
      if (!res.ok) {
        throw new Error(text || `HTTP error! status: ${res.status}`);
      }
      try {
        data = JSON.parse(text);
      } catch (e) {
        if (text.includes("Rate exceeded") || text.includes("Too Many Requests")) {
          throw new Error("AI is busy right now due to rate limits. Please try again shortly!");
        }
        throw new Error("Could not parse AI response.");
      }
      
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer || "I have updated your schedule." }]);
      
      if (data.tasks && data.tasks.length > 0) {
        // Map all tasks
        const formattedTasks: TaskState[] = data.tasks.map((t: any) => {
          const subtasks = (t.subtasks || []).map((st: any) => ({
            id: st.id || crypto.randomUUID(),
            title: st.title || '',
            estimatedMinutes: st.estimatedMinutes || 15
          }));
          return {
            title: t.title || 'New Task',
            description: t.description || '',
            priority: t.priority || 'Medium',
            category: t.category || 'General',
            recurring: t.recurring || 'None',
            estimatedMinutes: t.estimatedMinutes || 30,
            dueDate: t.dueDate || selectedDateString,
            subtasks: subtasks
          };
        });

        setTaskState(formattedTasks[0]);
        setPendingTasks(formattedTasks);

        if (autoSync) {
          let currentTasks = [];
          const saved = localStorage.getItem('actionpilot_tasks');
          if (saved) {
            try {
              currentTasks = JSON.parse(saved);
            } catch(e) {}
          }

          formattedTasks.forEach((t) => {
            const newTask = {
              id: crypto.randomUUID(),
              userId: 'current-user',
              title: t.title,
              description: t.description,
              priority: t.priority,
              category: t.category,
              recurring: t.recurring,
              status: 'Pending',
              dueDate: t.dueDate,
              estimatedMinutes: t.estimatedMinutes,
              subtasks: t.subtasks.map(st => ({
                id: st.id,
                title: st.title,
                completed: false,
                estimatedMinutes: st.estimatedMinutes
              })),
              createdAt: new Date().toISOString(),
              isAiGenerated: true
            };
            currentTasks.push(newTask);
            logActivity('task_created', `AI Auto-Synced Task: ${newTask.title}`);
          });

          localStorage.setItem('actionpilot_tasks', JSON.stringify(currentTasks));
          window.dispatchEvent(new Event('tasks_updated'));
          toast.success(`Auto-Scheduled: Added ${formattedTasks.length} separate tasks to your schedule!`);
        }
      } else if (data.task) {
        // Map subtasks to ensure each has a unique ID
        const formattedSubtasks = (data.task.subtasks || []).map((st: any) => ({
          id: st.id || crypto.randomUUID(),
          title: st.title || '',
          estimatedMinutes: st.estimatedMinutes || 15
        }));

        const newTaskState: TaskState = {
          title: data.task.title || 'New Task',
          description: data.task.description || '',
          priority: data.task.priority || 'Medium',
          category: data.task.category || 'General',
          recurring: data.task.recurring || 'None',
          estimatedMinutes: data.task.estimatedMinutes || 30,
          dueDate: data.task.dueDate || selectedDateString,
          subtasks: formattedSubtasks
        };

        setTaskState(newTaskState);
        setPendingTasks([newTaskState]);

        if (autoSync) {
          let currentTasks = [];
          const saved = localStorage.getItem('actionpilot_tasks');
          if (saved) {
            try {
              currentTasks = JSON.parse(saved);
            } catch(e) {}
          }

          const newTask = {
            id: crypto.randomUUID(),
            userId: 'current-user',
            title: newTaskState.title,
            description: newTaskState.description,
            priority: newTaskState.priority,
            category: newTaskState.category,
            recurring: newTaskState.recurring,
            status: 'Pending',
            dueDate: newTaskState.dueDate,
            estimatedMinutes: newTaskState.estimatedMinutes,
            subtasks: newTaskState.subtasks.map(st => ({
              id: st.id,
              title: st.title,
              completed: false,
              estimatedMinutes: st.estimatedMinutes
            })),
            createdAt: new Date().toISOString(),
            isAiGenerated: true
          };

          currentTasks.push(newTask);
          localStorage.setItem('actionpilot_tasks', JSON.stringify(currentTasks));
          window.dispatchEvent(new Event('tasks_updated'));
          logActivity('task_created', `AI Auto-Synced Task: ${newTask.title}`);
          toast.success(`Auto-Scheduled: "${newTask.title}" added to active tasks!`);
        }
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Failed to communicate with AI');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await apiFetch('/api/ai/upload', {
        method: 'POST',
        body: formData
      });
      
      const text = await res.text();
      let data;
      if (!res.ok) {
        throw new Error(text || `HTTP error! status: ${res.status}`);
      }
      try {
        data = JSON.parse(text);
      } catch (e) {
        if (text.includes("Rate exceeded") || text.includes("Too Many Requests")) {
          throw new Error("AI is busy right now due to rate limits. Please try again shortly!");
        }
        throw new Error("Could not parse AI response.");
      }
      
      if (data && data.length > 0) {
        const firstTask = data[0];
        const formattedSubtasks = (firstTask.subtasks || []).map((st: any) => ({
          id: crypto.randomUUID(),
          title: st.title || '',
          estimatedMinutes: st.estimatedMinutes || 15
        }));

        const selectedDateString = localStorage.getItem('actionpilot_prefilled_task_date') || new Date().toISOString();
        const parsedTask: TaskState = {
          title: firstTask.title || 'New Task from Document',
          description: firstTask.description || 'Extracted from uploaded document',
          priority: firstTask.priority || 'Medium',
          category: firstTask.category || 'General',
          recurring: firstTask.recurring || 'None',
          estimatedMinutes: firstTask.estimatedMinutes || 30,
          dueDate: firstTask.dueDate || selectedDateString,
          subtasks: formattedSubtasks
        };

        setTaskState(parsedTask);
        setMessages(prev => [
          ...prev, 
          { role: 'user', content: `[Uploaded document: ${file.name}]` },
          { role: 'assistant', content: `I have successfully analyzed "${file.name}" and extracted a custom automated task plan. You can preview, edit, and schedule it on the right side.` }
        ]);

        if (autoSync) {
          let currentTasks = [];
          const saved = localStorage.getItem('actionpilot_tasks');
          if (saved) {
            try {
              currentTasks = JSON.parse(saved);
            } catch(e) {}
          }

          const newTask = {
            id: crypto.randomUUID(),
            userId: 'current-user',
            title: parsedTask.title,
            description: parsedTask.description,
            priority: parsedTask.priority,
            category: parsedTask.category,
            recurring: parsedTask.recurring,
            status: 'Pending',
            dueDate: parsedTask.dueDate,
            estimatedMinutes: parsedTask.estimatedMinutes,
            subtasks: parsedTask.subtasks.map(st => ({
              id: st.id,
              title: st.title,
              completed: false,
              estimatedMinutes: st.estimatedMinutes
            })),
            createdAt: new Date().toISOString(),
            isAiGenerated: true
          };

          currentTasks.push(newTask);
          localStorage.setItem('actionpilot_tasks', JSON.stringify(currentTasks));
          window.dispatchEvent(new Event('tasks_updated'));
          logActivity('task_created', `AI Auto-Synced Document Task: ${newTask.title}`);
          toast.success(`Auto-Scheduled: "${newTask.title}" added to active tasks!`);
        } else {
          toast.success(`Extracted tasks from document`);
        }
      } else {
        toast.error('No tasks found in document');
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Failed to analyze document');
    } finally {
      setIsAnalyzing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Helper functions to manually edit and manage task state
  const updateTaskField = (field: keyof TaskState, value: any) => {
    if (!taskState) return;
    setTaskState({
      ...taskState,
      [field]: value
    });
  };

  const updateSubtask = (subtaskId: string, field: keyof Subtask, value: any) => {
    if (!taskState) return;
    const updatedSubtasks = taskState.subtasks.map(st => {
      if (st.id === subtaskId) {
        return { ...st, [field]: value };
      }
      return st;
    });
    setTaskState({
      ...taskState,
      subtasks: updatedSubtasks
    });
  };

  const deleteSubtask = (subtaskId: string) => {
    if (!taskState) return;
    const filtered = taskState.subtasks.filter(st => st.id !== subtaskId);
    setTaskState({
      ...taskState,
      subtasks: filtered
    });
    toast.success('Particular task step removed');
  };

  const addSubtask = () => {
    if (!taskState) return;
    const newStep: Subtask = {
      id: crypto.randomUUID(),
      title: 'New execution step',
      estimatedMinutes: 15
    };
    setTaskState({
      ...taskState,
      subtasks: [...taskState.subtasks, newStep]
    });
    toast.success('New task step added');
  };

  // Bulk and Multi-task selection helpers
  const toggleSelectSubtask = (id: string) => {
    setSelectedSubtaskIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllSubtasks = () => {
    if (!taskState) return;
    if (selectedSubtaskIds.length === taskState.subtasks.length) {
      setSelectedSubtaskIds([]);
    } else {
      setSelectedSubtaskIds(taskState.subtasks.map(st => st.id));
    }
  };

  const deleteSelectedSubtasks = () => {
    if (!taskState || selectedSubtaskIds.length === 0) return;
    const filtered = taskState.subtasks.filter(st => !selectedSubtaskIds.includes(st.id));
    setTaskState({
      ...taskState,
      subtasks: filtered
    });
    setSelectedSubtaskIds([]);
    toast.success(`Removed ${selectedSubtaskIds.length} task steps`);
  };

  const increaseSelectedSubtasksDuration = (amount: number) => {
    if (!taskState || selectedSubtaskIds.length === 0) return;
    const updated = taskState.subtasks.map(st => {
      if (selectedSubtaskIds.includes(st.id)) {
        return { ...st, estimatedMinutes: Math.max(1, st.estimatedMinutes + amount) };
      }
      return st;
    });
    setTaskState({
      ...taskState,
      subtasks: updated
    });
    toast.success(`Updated duration for ${selectedSubtaskIds.length} steps`);
  };

  const handleSaveToSchedule = () => {
    if (!taskState) return;

    let currentTasks = [];
    const saved = localStorage.getItem('actionpilot_tasks');
    if (saved) {
      try {
        currentTasks = JSON.parse(saved);
      } catch(e) {}
    }

    const tasksToSave = pendingTasks.length > 0 ? pendingTasks : [taskState];

    tasksToSave.forEach(t => {
      const newTask = {
        id: crypto.randomUUID(),
        userId: 'current-user',
        title: t.title,
        description: t.description,
        priority: t.priority,
        category: t.category,
        recurring: t.recurring,
        status: 'Pending',
        dueDate: t.dueDate || getDueDate(),
        estimatedMinutes: t.estimatedMinutes,
        subtasks: t.subtasks.map(st => ({
          id: st.id,
          title: st.title,
          completed: false,
          estimatedMinutes: st.estimatedMinutes
        })),
        createdAt: new Date().toISOString(),
        isAiGenerated: true
      };
      currentTasks.push(newTask);
      logActivity('task_created', `AI Task Created: ${newTask.title}`);
    });

    localStorage.setItem('actionpilot_tasks', JSON.stringify(currentTasks));
    window.dispatchEvent(new Event('tasks_updated'));

    if (tasksToSave.length > 1) {
      toast.success(`Successfully synchronized ${tasksToSave.length} tasks to your schedule!`);
    } else {
      toast.success('Task successfully synchronized and added to your schedule!');
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1000px] w-[95vw] h-[85vh] max-h-[800px] bg-background/95 backdrop-blur-xl border-border/50 shadow-2xl p-0 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border/50 bg-muted/20 shrink-0 flex items-center justify-between">
          <div>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Sparkles className="w-5 h-5 text-primary animate-pulse" />
              Interactive AI Task Studio
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-0.5">
              Converse with the AI bot to automate, edit, and plan tasks, or refine them manually in real-time.
            </DialogDescription>
          </div>
        </div>

        {/* Dual Pane Body */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row w-full min-w-0">
          {/* Left Pane: Chat Bot (Conversational Automation) */}
          <div className="w-full md:w-[380px] lg:w-[420px] border-r border-border/50 flex flex-col h-full bg-muted/5 overflow-hidden shrink-0 min-w-0">
            {/* Status bar & Auto Sync Trigger toggle */}
            <div className="px-4 py-2 border-b border-border/40 bg-card flex items-center justify-between text-xs shrink-0 shadow-sm">
              <span className="text-muted-foreground flex items-center gap-1.5 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                AI Assistant Active
              </span>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className="text-muted-foreground font-medium">Auto-Sync to Schedule</span>
                <input 
                  type="checkbox" 
                  checked={autoSync} 
                  onChange={(e) => setAutoSync(e.target.checked)} 
                  className="rounded border-gray-300 dark:border-border/50 text-primary focus:ring-primary w-3.5 h-3.5 transition-colors"
                />
              </label>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">
              {messages.map((msg, index) => (
                <div key={index} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm break-words whitespace-pre-wrap ${
                    msg.role === 'user' 
                      ? 'bg-primary text-primary-foreground rounded-tr-none' 
                      : 'bg-card border border-border/60 rounded-tl-none shadow-sm'
                  }`}>
                    {msg.content}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <UserIcon className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {isAnalyzing && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-primary animate-bounce" />
                  </div>
                  <div className="bg-card border border-border/60 rounded-2xl rounded-tl-none px-4 py-3 text-sm shadow-sm flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                    Analyzing and planning automation...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Form at bottom of Chat */}
            <div className="p-3 border-t border-border/50 bg-background/50 shrink-0">
              <div className="relative flex items-end gap-2 bg-muted/40 border border-border/80 rounded-xl p-2 focus-within:border-primary/50 transition-colors">
                <Textarea
                  placeholder="Ask me to schedule a task or refine it..."
                  value={input + (interimText ? (input ? ' ' : '') + interimText : '')}
                  onChange={(e) => {
                    setInput(e.target.value);
                    setInterimText('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="min-h-[40px] max-h-[120px] resize-none bg-transparent border-0 focus-visible:ring-0 shadow-none py-1.5 px-2 text-sm flex-1"
                />
                <div className="flex items-center gap-1">
                  <Button 
                    type="button"
                    variant="ghost" 
                    size="icon" 
                    className={`h-8 w-8 rounded-full ${isRecording ? 'bg-destructive/10 text-destructive' : 'text-muted-foreground hover:text-foreground'}`}
                    onClick={toggleRecording}
                  >
                    <Mic className="w-4 h-4" />
                  </Button>
                  <Button 
                    type="button"
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4" />
                  </Button>
                  <Button 
                    type="button"
                    size="icon" 
                    onClick={() => handleSendMessage()}
                    disabled={!input.trim() || isAnalyzing}
                    className="h-8 w-8 rounded-full"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <input 
                type="file" 
                className="hidden" 
                ref={fileInputRef} 
                accept=".pdf,image/*,.docx" 
                onChange={handleFileUpload}
              />
            </div>
          </div>

          {/* Right Pane: Live Task Planner & Editor */}
          <div className="flex-1 flex flex-col h-full bg-background overflow-hidden min-w-0">
            {taskState ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Scrollable Editor */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                  <div className="space-y-4">
                    {/* Title */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Task Title</label>
                      <input 
                        type="text"
                        value={taskState.title}
                        onChange={(e) => updateTaskField('title', e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-semibold text-base"
                        placeholder="Task Title"
                      />
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</label>
                      <Textarea 
                        value={taskState.description}
                        onChange={(e) => updateTaskField('description', e.target.value)}
                        className="min-h-[80px] text-sm"
                        placeholder="Add some details about the task..."
                      />
                    </div>

                    {/* Meta Controls Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Priority</label>
                        <Select
                          value={taskState.priority}
                          onValueChange={(val: 'High' | 'Medium' | 'Low') => updateTaskField('priority', val)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="High" className="text-destructive font-medium">High</SelectItem>
                            <SelectItem value="Medium" className="text-orange-500 font-medium">Medium</SelectItem>
                            <SelectItem value="Low" className="text-green-500 font-medium">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</label>
                        <Select
                          value={taskState.category}
                          onValueChange={(val) => updateTaskField('category', val)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="General">General</SelectItem>
                            <SelectItem value="Work">Work</SelectItem>
                            <SelectItem value="Personal">Personal</SelectItem>
                            <SelectItem value="Shopping">Shopping</SelectItem>
                            <SelectItem value="Health">Health</SelectItem>
                            <SelectItem value="Errands">Errands</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recurring</label>
                        <Select
                          value={taskState.recurring}
                          onValueChange={(val: any) => updateTaskField('recurring', val)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="None">One-time</SelectItem>
                            <SelectItem value="Daily">Daily</SelectItem>
                            <SelectItem value="Weekly">Weekly</SelectItem>
                            <SelectItem value="Monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Duration (Mins)</label>
                        <div className="relative">
                          <input 
                            type="number"
                            value={taskState.estimatedMinutes}
                            onChange={(e) => updateTaskField('estimatedMinutes', parseInt(e.target.value) || 0)}
                            className="flex h-10 w-full rounded-md border border-input bg-background pl-3 pr-10 py-2 text-sm"
                            min="0"
                          />
                          <Clock className="w-4 h-4 text-muted-foreground absolute right-3 top-3" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Scheduled Date</label>
                        <input 
                          type="date"
                          value={taskState.dueDate ? taskState.dueDate.split('T')[0] : ''}
                          onChange={(e) => updateTaskField('dueDate', e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Execution Steps / Subtasks Section */}
                  <div className="pt-4 border-t border-border/60">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Target className="w-4 h-4 text-primary" />
                          Automated Execution Steps ({taskState.subtasks.length})
                        </h4>
                        {taskState.subtasks.length > 0 && (
                          <Button 
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[11px] text-muted-foreground hover:text-foreground gap-1 px-1.5"
                            onClick={toggleSelectAllSubtasks}
                          >
                            {selectedSubtaskIds.length === taskState.subtasks.length ? 'Deselect All' : 'Select All'}
                          </Button>
                        )}
                      </div>
                      <Button 
                        type="button"
                        variant="outline" 
                        size="sm" 
                        className="h-7 text-xs gap-1"
                        onClick={addSubtask}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Step
                      </Button>
                    </div>

                    <AnimatePresence>
                      {selectedSubtaskIds.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0, y: -10 }}
                          animate={{ opacity: 1, height: 'auto', y: 0 }}
                          exit={{ opacity: 0, height: 0, y: -10 }}
                          className="overflow-hidden mb-3"
                        >
                          <div className="bg-primary/5 border border-primary/20 rounded-lg p-2.5 flex items-center justify-between text-xs gap-2">
                            <div className="flex items-center gap-2 font-medium">
                              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                                {selectedSubtaskIds.length} selected
                              </span>
                              <span className="text-muted-foreground">Bulk operations:</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                className="h-7 text-[11px] px-2 py-1 gap-1"
                                onClick={() => increaseSelectedSubtasksDuration(5)}
                              >
                                <PlusCircle className="w-3 h-3 text-emerald-500" />
                                +5m
                              </Button>
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                className="h-7 text-[11px] px-2 py-1 gap-1"
                                onClick={() => increaseSelectedSubtasksDuration(-5)}
                              >
                                <Minus className="w-3 h-3 text-rose-500" />
                                -5m
                              </Button>
                              <Button 
                                type="button" 
                                variant="destructive" 
                                size="sm" 
                                className="h-7 text-[11px] px-2 py-1 gap-1"
                                onClick={deleteSelectedSubtasks}
                              >
                                <Trash2 className="w-3 h-3" />
                                Delete ({selectedSubtaskIds.length})
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {taskState.subtasks.length > 0 ? (
                      <div className="space-y-2">
                        {taskState.subtasks.map((st, i) => (
                          <div 
                            key={st.id} 
                            className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                              selectedSubtaskIds.includes(st.id)
                                ? 'border-primary/40 bg-primary/5'
                                : 'border-border bg-muted/25 hover:border-border/80'
                            }`}
                          >
                            {/* Checkbox for Multi-Task Selection */}
                            <button
                              type="button"
                              onClick={() => toggleSelectSubtask(st.id)}
                              className={`w-5 h-5 rounded border flex items-center justify-center transition-all shrink-0 ${
                                selectedSubtaskIds.includes(st.id)
                                  ? 'bg-primary border-primary text-primary-foreground shadow-sm'
                                  : 'border-muted-foreground/30 hover:border-primary/50 text-transparent'
                              }`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </button>

                            <div className="w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
                              <span className="text-[11px] font-semibold text-muted-foreground">{i+1}</span>
                            </div>
                            <input 
                              type="text"
                              value={st.title}
                              onChange={(e) => updateSubtask(st.id, 'title', e.target.value)}
                              className="bg-transparent border-0 focus-visible:ring-0 shadow-none p-0 text-sm flex-1 font-medium text-foreground"
                              placeholder="Describe this step..."
                            />
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="relative w-16">
                                <input 
                                  type="number"
                                  value={st.estimatedMinutes}
                                  onChange={(e) => updateSubtask(st.id, 'estimatedMinutes', parseInt(e.target.value) || 0)}
                                  className="w-full text-center h-8 rounded border border-border bg-background p-1 text-xs"
                                  min="0"
                                />
                                <span className="absolute right-1 top-2 text-[9px] text-muted-foreground">m</span>
                              </div>
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md"
                                onClick={() => deleteSubtask(st.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 border border-dashed rounded-lg text-muted-foreground text-sm">
                        No subtask execution steps. Click "+ Add Step" to create custom subtasks.
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Sync Action */}
                <div className="p-4 border-t border-border bg-muted/10 shrink-0 flex items-center justify-between">
                  <Button variant="ghost" size="sm" onClick={() => setTaskState(null)} className="gap-1 text-muted-foreground hover:text-foreground">
                    <RefreshCw className="w-3.5 h-3.5" />
                    Reset
                  </Button>
                  <Button onClick={handleSaveToSchedule} className="gap-2 font-semibold">
                    <ListTodo className="w-4 h-4" />
                    Add Plan to Schedule
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Ready to Schedule Tasks</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mt-1">
                    Describe what you need to get done in the chat on the left. The AI will build a custom, step-by-step automated timeline.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 max-w-md">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs rounded-full"
                    onClick={() => handleSendMessage("Create a workout schedule for this week")}
                  >
                    "Workout Schedule"
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs rounded-full"
                    onClick={() => handleSendMessage("Help me plan my cybersecurity exam revision by Friday")}
                  >
                    "Exam Revision"
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs rounded-full"
                    onClick={() => handleSendMessage("Plan a shopping list and timeline for dinner party prep")}
                  >
                    "Dinner Prep List"
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
