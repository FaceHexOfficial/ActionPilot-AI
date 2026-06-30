import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { Button } from '../components/ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Brain, 
  Zap, 
  Clock, 
  CalendarDays, 
  Plus, 
  AlertTriangle, 
  AlertCircle,
  TrendingUp, 
  Target, 
  CheckSquare, 
  Mic, 
  Loader2,
  Cake,
  Gift,
  Bell,
  Play,
  Pause,
  RotateCcw,
  Check,
  Award,
  ChevronRight,
  Sparkles,
  MessageSquare,
  Send,
  Smartphone,
  Activity,
  UserCheck,
  Droplets,
  Pill,
  Star,
  Monitor,
  Search
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import ActivityLogWidget from '../components/ActivityLogWidget';
import DailyDigestWidget from '../components/DailyDigestWidget';
import VoiceCommand from '../components/VoiceCommand';
import { logActivity } from '../lib/activity';
import { Task } from '../types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { getTaskDateString, apiFetch } from '../lib/utils';

interface DashboardProps {
  user: any;
}

export default function Dashboard({ user }: DashboardProps) {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showVoiceMenu, setShowVoiceMenu] = useState(false);
  const [focusTask, setFocusTask] = useState<{task: Task | null, reason: string | null, isLoading: boolean}>({task: null, reason: null, isLoading: true});
  const recognitionRef = useRef<any>(null);

  // Focus Timer States
  const [activeTimerTaskId, setActiveTimerTaskId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const timerIntervalRef = useRef<any>(null);

  // Birthdays States
  const [birthdaysThisWeek, setBirthdaysThisWeek] = useState<any[]>([]);
  const [totalBirthdaysThisMonth, setTotalBirthdaysThisMonth] = useState(0);
  const [deletedTasksCount, setDeletedTasksCount] = useState(0);

  // Routine & Custom Events States
  const [medications, setMedications] = useState<any[]>([]);
  const [waterReminders, setWaterReminders] = useState<any[]>([]);
  const [stretchReminders, setStretchReminders] = useState<any[]>([]);
  const [importantEvents, setImportantEvents] = useState<any[]>([]);
  const [smsMessages, setSmsMessages] = useState<any[]>([]);
  const [smsPermission, setSmsPermission] = useState<boolean>(() => {
    return localStorage.getItem('actionpilot_sms_permission_granted') === 'true';
  });
  const [smsConnected, setSmsConnected] = useState<boolean>(() => {
    return localStorage.getItem('actionpilot_connected_sms') === 'true';
  });
  const [activeSender, setActiveSender] = useState<string>('Mom');
  const [smsInput, setSmsInput] = useState<string>('');
  const [activeChartTab, setActiveChartTab] = useState<'urgency' | 'lifecycle'>('urgency');
  const [showProductivityDetails, setShowProductivityDetails] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadAllLocalData = () => {
      let loadedTasks: Task[] = [];
      const saved = localStorage.getItem('actionpilot_tasks');
      if (saved) {
        try {
          loadedTasks = JSON.parse(saved);
          setTasks(loadedTasks);
        } catch(e) {}
      }

      // Check for birthdays this week
      const savedBdays = localStorage.getItem('actionpilot_birthdays');
      if (savedBdays) {
        try {
          const bdays = JSON.parse(savedBdays);
          const today = new Date();
          const nextWeek = new Date();
          nextWeek.setDate(today.getDate() + 7);

          const filtered = bdays.filter((b: any) => {
            const bDate = new Date(b.date);
            // check recurrence on current year
            const bdayThisYear = new Date(today.getFullYear(), bDate.getMonth(), bDate.getDate());
            const bdayNextYear = new Date(today.getFullYear() + 1, bDate.getMonth(), bDate.getDate());
            
            return (bdayThisYear >= today && bdayThisYear <= nextWeek) || 
                   (bdayNextYear >= today && bdayNextYear <= nextWeek);
          });
          setBirthdaysThisWeek(filtered);

          // Count birthdays & anniversaries for the current calendar month
          const currentMonthStr = (today.getMonth() + 1).toString().padStart(2, '0');
          const thisMonthReminders = bdays.filter((b: any) => {
            if (!b.date) return false;
            const parts = b.date.split('-');
            if (parts.length >= 2) {
              return parts[1] === currentMonthStr;
            }
            return false;
          });
          setTotalBirthdaysThisMonth(thisMonthReminders.length);
        } catch (e) {
          setTotalBirthdaysThisMonth(0);
        }
      } else {
        setTotalBirthdaysThisMonth(0);
      }

      // Load deleted tasks count
      const savedDeleted = localStorage.getItem('actionpilot_deleted_tasks');
      if (savedDeleted) {
        try {
          const arr = JSON.parse(savedDeleted);
          setDeletedTasksCount(arr.length);
        } catch (e) {
          setDeletedTasksCount(0);
        }
      } else {
        setDeletedTasksCount(0);
      }

      // Load Medications
      const savedMeds = localStorage.getItem('actionpilot_medications');
      if (savedMeds) {
        try {
          setMedications(JSON.parse(savedMeds));
        } catch (e) {}
      } else {
        setMedications([]);
      }

      // Load Custom Water Reminders
      const savedWater = localStorage.getItem('actionpilot_custom_water_reminders');
      if (savedWater) {
        try {
          setWaterReminders(JSON.parse(savedWater));
        } catch (e) {}
      } else {
        setWaterReminders([]);
      }

      // Load Custom Stretch Reminders
      const savedStretch = localStorage.getItem('actionpilot_custom_stretch_reminders');
      if (savedStretch) {
        try {
          setStretchReminders(JSON.parse(savedStretch));
        } catch (e) {}
      } else {
        setStretchReminders([]);
      }

      // Load Important Events
      const savedEvents = localStorage.getItem('actionpilot_events');
      if (savedEvents) {
        try {
          setImportantEvents(JSON.parse(savedEvents));
        } catch (e) {}
      } else {
        setImportantEvents([]);
      }

      // Load Messages
      const savedMessages = localStorage.getItem('actionpilot_messages');
      if (savedMessages) {
        try {
          setSmsMessages(JSON.parse(savedMessages));
        } catch (e) {}
      } else {
        const defaultMsgs = [
          { id: '1', platform: 'SMS' as const, sender: 'Mom', content: 'Hey honey, did you take your vitamins today?', time: '09:00 AM', isRead: true },
          { id: '2', platform: 'SMS' as const, sender: '+1 555-0198', content: 'Urgent: Client inquiry ready for review in your inbox.', time: '10:30 AM', isRead: false },
        ];
        localStorage.setItem('actionpilot_messages', JSON.stringify(defaultMsgs));
        setSmsMessages(defaultMsgs);
      }

      // Load SMS Permission & Connection status
      setSmsPermission(localStorage.getItem('actionpilot_sms_permission_granted') === 'true');
      setSmsConnected(localStorage.getItem('actionpilot_connected_sms') === 'true');

      const pendingTasks = loadedTasks.filter(t => t.status !== 'Completed' && t.status !== 'Skipped');
      if (pendingTasks.length > 0) {
        setFocusTask(prev => ({ ...prev, isLoading: true }));
        apiFetch('/api/ai/focus-task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tasks: pendingTasks })
        })
        .then(async res => {
          const text = await res.text();
          if (!res.ok) {
            throw new Error(text || `HTTP error! status: ${res.status}`);
          }
          try {
            return JSON.parse(text);
          } catch (e) {
            if (text.includes("Rate exceeded") || text.includes("Too Many Requests")) {
              return { 
                taskId: pendingTasks[0]?.id || null, 
                reason: "AI is on a quick break due to rate limits! Pick a task and keep the momentum going." 
              };
            }
            throw new Error(`Invalid JSON: ${text.substring(0, 50)}`);
          }
        })
        .then(data => {
          if (data && data.taskId) {
            const t = pendingTasks.find(t => t.id === data.taskId);
            setFocusTask({ task: t || null, reason: data.reason, isLoading: false });
          } else {
            setFocusTask({ task: null, reason: null, isLoading: false });
          }
        })
        .catch(err => {
          console.error("Failed to load focus task", err);
          setFocusTask({ 
            task: pendingTasks[0] || null, 
            reason: "AI is on a quick break due to rate limits! Pick a task and keep the momentum going.", 
            isLoading: false 
          });
        });
      } else {
        setFocusTask({ task: null, reason: null, isLoading: false });
      }
    };

    loadAllLocalData();
    window.addEventListener('tasks_updated', loadAllLocalData);
    window.addEventListener('birthdays_updated', loadAllLocalData);
    window.addEventListener('connections_updated', loadAllLocalData);

    // Setup Speech Recognition
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = async (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        setVoiceText(interimTranscript || finalTranscript);

        if (finalTranscript) {
          recognitionRef.current?.stop();
          await handleVoiceTask(finalTranscript);
        }
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
        setTimeout(() => setVoiceText(""), 2000);
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsRecording(false);
        toast.error("Failed to capture voice. Please try again.");
      };
    }

    return () => {
      window.removeEventListener('tasks_updated', loadAllLocalData);
      window.removeEventListener('birthdays_updated', loadAllLocalData);
      window.removeEventListener('connections_updated', loadAllLocalData);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  // Timer Tick Logic
  useEffect(() => {
    if (isTimerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            setIsTimerRunning(false);
            handleCompleteTimerTask();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isTimerRunning, activeTimerTaskId]);

  const startFocusTimer = (task: Task) => {
    setActiveTimerTaskId(task.id);
    setTimeLeft((task.estimatedMinutes || 25) * 60);
    setIsTimerRunning(true);
    toast.success(`Focus session started for "${task.title}"!`);
  };

  const toggleTimer = () => {
    setIsTimerRunning(!isTimerRunning);
  };

  const handleCompleteTimerTask = () => {
    if (!activeTimerTaskId) return;
    completeTask(activeTimerTaskId);
    setActiveTimerTaskId(null);
    setIsTimerRunning(false);
    toast.success('Awesome job! Focus session completed successfully.');
  };

  const handleVoiceTask = async (transcript: string) => {
    setIsAnalyzing(true);
    const toastId = toast.loading('Analyzing voice memo...');
    try {
      const res = await apiFetch('/api/ai/analyze-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: transcript,
          currentDate: new Date().toISOString(),
          selectedDate: new Date().toISOString()
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
      
      if (data && !data.error) {
        if (data.isQuestion) {
          toast.success("AI Replied", { id: toastId });
          const utterance = new SpeechSynthesisUtterance(data.answer);
          utterance.lang = 'en-US';
          window.speechSynthesis.speak(utterance);
          setVoiceText(data.answer);
          setTimeout(() => setVoiceText(""), 5000);
          return;
        }

        let currentTasks: Task[] = [];
        const saved = localStorage.getItem('actionpilot_tasks');
        if (saved) {
          try {
            currentTasks = JSON.parse(saved);
          } catch(e) {}
        }

        const tasksToSave = (data.tasks && data.tasks.length > 0) ? data.tasks : [data];
        const addedTitles: string[] = [];

        tasksToSave.forEach((t: any) => {
          const newTask: Task = {
            id: crypto.randomUUID(),
            userId: 'current-user',
            title: t.title || 'New Voice Task',
            description: t.description || transcript,
            priority: t.priority || 'Medium',
            recurring: t.recurring || 'None',
            category: t.category || 'General',
            status: 'Pending',
            dueDate: t.dueDate || new Date().toISOString(),
            createdAt: new Date().toISOString(),
            estimatedMinutes: t.estimatedMinutes || 30,
            isAiGenerated: true,
            subtasks: t.subtasks ? t.subtasks.map((st: any) => ({
              id: crypto.randomUUID(),
              title: st.title,
              completed: false,
              estimatedMinutes: st.estimatedMinutes || 10
            })) : []
          };
          currentTasks.push(newTask);
          addedTitles.push(newTask.title);
          logActivity('automation_triggered', `Voice task created: ${newTask.title}`);
        });

        localStorage.setItem('actionpilot_tasks', JSON.stringify(currentTasks));
        setTasks(currentTasks);
        window.dispatchEvent(new Event('tasks_updated'));

        if (tasksToSave.length > 1) {
          toast.success(`Added ${tasksToSave.length} separate tasks: ${addedTitles.join(', ')}`, { id: toastId });
        } else {
          toast.success(`Task added: ${tasksToSave[0].title}`, { id: toastId });
        }
      } else {
        throw new Error(data.error || "Failed to analyze");
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Could not create task from voice memo', { id: toastId });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleVoiceRecording = () => {
    if (isAnalyzing) return;
    
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          setIsRecording(true);
        } catch (e) {
          console.error("Microphone error", e);
          toast.error("Could not start microphone.");
        }
      } else {
        toast.error("Speech recognition not supported in this browser.");
      }
    }
  };

  const completeTask = (taskId: string) => {
    const saved = localStorage.getItem('actionpilot_tasks');
    if (saved) {
      try {
        const currentTasks: Task[] = JSON.parse(saved);
        const taskObj = currentTasks.find(t => t.id === taskId);
        const updated = currentTasks.map(t => t.id === taskId ? { ...t, status: 'Completed' as const } : t);
        localStorage.setItem('actionpilot_tasks', JSON.stringify(updated));
        setTasks(updated);
        window.dispatchEvent(new Event('tasks_updated'));
        if (taskObj) {
          logActivity('task_completed', `Task completed from dashboard: ${taskObj.title}`);
          toast.success(`Completed: ${taskObj.title}`);
        }
      } catch(e) {}
    }
  };

  const handleCompleteFocusTask = () => {
    if (!focusTask.task) return;
    completeTask(focusTask.task.id);
  };

  const handleSkipFocusTask = () => {
    if (!focusTask.task) return;
    const skipped = localStorage.getItem('actionpilot_skipped_tasks') || '[]';
    const skippedArr = JSON.parse(skipped);
    if (!skippedArr.includes(focusTask.task.id)) {
      skippedArr.push(focusTask.task.id);
      localStorage.setItem('actionpilot_skipped_tasks', JSON.stringify(skippedArr));
    }
    
    const saved = localStorage.getItem('actionpilot_tasks');
    if (saved) {
      try {
        const currentTasks: Task[] = JSON.parse(saved);
        const updated = currentTasks.map(t => t.id === focusTask.task!.id ? { ...t, status: 'Skipped' as const } : t);
        localStorage.setItem('actionpilot_tasks', JSON.stringify(updated));
        setTasks(updated);
        window.dispatchEvent(new Event('tasks_updated'));
        toast('Task skipped for now.');
      } catch(e) {}
    }
  };

  const todayTasks = tasks.filter(t => {
    if (!t.dueDate) return false;
    return getTaskDateString(t.dueDate) === getTaskDateString(new Date().toISOString());
  });

  const completedToday = todayTasks.filter(t => t.status === 'Completed').length;
  const totalToday = todayTasks.length;

  const overallCompleted = tasks.filter(t => t.status === 'Completed').length;
  const overallTotal = tasks.length;
  const overallRate = overallTotal > 0 ? (overallCompleted / overallTotal) : 0.84;

  const todayRate = totalToday > 0 ? (completedToday / totalToday) : 0.84;

  const highPriorityTasks = tasks.filter(t => t.priority === 'High');
  const highPriorityCompleted = highPriorityTasks.filter(t => t.status === 'Completed').length;
  const highPriorityRate = highPriorityTasks.length > 0 ? (highPriorityCompleted / highPriorityTasks.length) : 0.84;

  const computedProductivityScore = Math.min(100, Math.round(
    (todayRate * 40) + 
    (overallRate * 35) + 
    (highPriorityRate * 25)
  ));
  
  const stats = {
    productivityScore: computedProductivityScore, 
    tasksCompletedToday: completedToday,
    totalTasksToday: totalToday,
    focusMinutes: completedToday * 45, 
    deadlineRisk: todayTasks.some(t => t.priority === 'High' && t.status !== 'Completed') ? 75 : 25
  };

  const completionPercentage = stats.totalTasksToday > 0 ? Math.round((stats.tasksCompletedToday / stats.totalTasksToday) * 100) : 0;
  const pendingImportant = todayTasks.filter(t => t.priority === 'High' && t.status !== 'Completed').length;

  // Calculation of advanced stats for Year, Month, AI Ratio and Analytics Breakdown
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  // Yearly Tasks
  const tasksThisYear = tasks.filter(t => {
    if (!t.dueDate) return false;
    return new Date(t.dueDate).getFullYear() === currentYear;
  });
  const totalTasksThisYear = tasksThisYear.length;
  const completedTasksThisYear = tasksThisYear.filter(t => t.status === 'Completed').length;
  const yearlyCompletionRate = totalTasksThisYear > 0 ? Math.round((completedTasksThisYear / totalTasksThisYear) * 100) : 0;

  // Monthly Tasks
  const tasksThisMonth = tasks.filter(t => {
    if (!t.dueDate) return false;
    const d = new Date(t.dueDate);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });
  const totalTasksThisMonth = tasksThisMonth.length;
  const completedTasksThisMonth = tasksThisMonth.filter(t => t.status === 'Completed').length;
  const monthlyCompletionRate = totalTasksThisMonth > 0 ? Math.round((completedTasksThisMonth / totalTasksThisMonth) * 100) : 0;

  // AI Delegation Ratio
  const totalTasksCount = tasks.length;
  const aiGeneratedCount = tasks.filter(t => t.isAiGenerated).length;
  const aiScheduledRatio = totalTasksCount > 0 ? Math.round((aiGeneratedCount / totalTasksCount) * 100) : 0;

  // Dynamic analysis chart data: Done vs Pending vs Skipped vs Deleted/Archived
  const totalDoneCount = tasks.filter(t => t.status === 'Completed').length;
  const totalPendingCount = tasks.filter(t => t.status === 'Pending' || t.status === 'In Progress').length;
  const totalSkippedCount = tasks.filter(t => t.status === 'Skipped').length;
  const totalDeletedCount = deletedTasksCount;

  const analysisChartData = [
    { name: 'Completed', count: totalDoneCount, color: '#10b981' },
    { name: 'Pending', count: totalPendingCount, color: '#3b82f6' },
    { name: 'Skipped', count: totalSkippedCount, color: '#eab308' },
    { name: 'Archived', count: totalDeletedCount, color: '#ef4444' }
  ];

  const priorityData = [
    { name: 'High Urgency', value: todayTasks.filter(t => t.priority === 'High' && t.status !== 'Completed').length, color: '#ef4444' },
    { name: 'Medium Urgency', value: todayTasks.filter(t => t.priority === 'Medium' && t.status !== 'Completed').length, color: '#f97316' },
    { name: 'Low Urgency', value: todayTasks.filter(t => t.priority === 'Low' && t.status !== 'Completed').length, color: '#22c55e' }
  ].filter(d => d.value > 0);

  const chartData = priorityData.length > 0 ? priorityData : [{ name: 'All caught up!', value: 1, color: '#10b981' }];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const getMinutesFromTimeStr = (timeStr: string): number => {
    if (!timeStr) return 0;
    if (timeStr.includes(':')) {
      const parts = timeStr.split(':');
      const hours = parseInt(parts[0], 10);
      const mins = parseInt(parts[1], 10);
      return hours * 60 + mins;
    }
    return 0;
  };

  const formatMinutesTo12Hour = (totalMinutes: number): string => {
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 === 0 ? 12 : hours % 12;
    const displayMins = mins.toString().padStart(2, '0');
    return `${displayHour}:${displayMins} ${period}`;
  };

  const getEnergyLevel = (sortMinutes: number) => {
    if (sortMinutes < 12 * 60) {
      return { label: 'Peak Focus', percent: 100, color: 'text-emerald-500 bg-emerald-500/10' };
    } else if (sortMinutes >= 12 * 60 && sortMinutes < 14 * 60) {
      return { label: 'Post-Lunch Dip', percent: 55, color: 'text-amber-500 bg-amber-500/10' };
    } else if (sortMinutes >= 14 * 60 && sortMinutes < 17 * 60) {
      return { label: 'High Momentum', percent: 85, color: 'text-blue-500 bg-blue-500/10' };
    } else if (sortMinutes >= 17 * 60 && sortMinutes < 20 * 60) {
      return { label: 'Evening Transition', percent: 60, color: 'text-purple-500 bg-purple-500/10' };
    } else {
      return { label: 'Wind Down', percent: 35, color: 'text-pink-500 bg-pink-500/10' };
    }
  };

  // Build the dynamic hour-based list for "Today's Schedule"
  const getTodaySchedule = () => {
    const items: any[] = [];
    const todayStr = new Date().toDateString();

    // 1. Add Today's Tasks
    todayTasks.forEach(task => {
      const date = new Date(task.dueDate);
      let hrs = date.getHours();
      let mins = date.getMinutes();
      // If midnight defaults (00:00), assign a productive hour based on priority
      if (hrs === 0 && mins === 0) {
        if (task.priority === 'High') { hrs = 9; }
        else if (task.priority === 'Medium') { hrs = 14; }
        else { hrs = 16; }
      }
      
      items.push({
        id: task.id,
        sortMinutes: hrs * 60 + mins,
        time: formatMinutesTo12Hour(hrs * 60 + mins),
        title: task.title,
        type: 'task',
        priority: task.priority,
        status: task.status === 'Completed' ? 'completed' : 'pending',
        duration: `${task.estimatedMinutes || 30}m`,
        taskRef: task,
        icon: 'check-square'
      });
    });

    // 2. Add Medications
    medications.forEach(med => {
      const sortMins = getMinutesFromTimeStr(med.time);
      items.push({
        id: med.id,
        sortMinutes: sortMins,
        time: formatMinutesTo12Hour(sortMins),
        title: `Take Medication: ${med.name}`,
        type: 'medication',
        priority: 'High',
        status: 'pending',
        duration: '5m',
        icon: 'pill'
      });
    });

    // 3. Add Custom Water Reminders
    waterReminders.forEach(water => {
      const sortMins = getMinutesFromTimeStr(water.time);
      items.push({
        id: water.id,
        sortMinutes: sortMins,
        time: formatMinutesTo12Hour(sortMins),
        title: `Hydration reminder: ${water.name || 'Drink water'}`,
        type: 'water',
        priority: 'Low',
        status: 'pending',
        duration: '5m',
        icon: 'droplets'
      });
    });

    // 4. Add Custom Stretch Reminders
    stretchReminders.forEach(stretch => {
      const sortMins = getMinutesFromTimeStr(stretch.time);
      items.push({
        id: stretch.id,
        sortMinutes: sortMins,
        time: formatMinutesTo12Hour(sortMins),
        title: `Stretch break: ${stretch.name || 'Stand up & Stretch'}`,
        type: 'stretch',
        priority: 'Medium',
        status: 'pending',
        duration: '10m',
        icon: 'activity'
      });
    });

    // 5. Add Important Events today
    importantEvents.filter(evt => {
      if (!evt.date) return false;
      const evtDate = new Date(evt.date);
      return evtDate.getMonth() === new Date().getMonth() && evtDate.getDate() === new Date().getDate();
    }).forEach(evt => {
      items.push({
        id: evt.id,
        sortMinutes: 8 * 60, // Pin to 08:00 AM as important morning notice
        time: '08:00 AM',
        title: `⭐ Today's Event: ${evt.name} (${evt.type})`,
        type: 'event',
        priority: 'High',
        status: 'pending',
        duration: 'All Day',
        icon: 'star'
      });
    });

    // Sort chronologically
    return items.sort((a, b) => a.sortMinutes - b.sortMinutes);
  };

  // Helper to format remaining timer duration (mm:ss)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendSms = () => {
    if (!smsInput.trim()) return;

    const newMsg = {
      id: Date.now().toString(),
      platform: 'SMS' as const,
      sender: 'You',
      content: smsInput,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isRead: true
    };

    const updated = [...smsMessages, newMsg];
    localStorage.setItem('actionpilot_messages', JSON.stringify(updated));
    setSmsMessages(updated);
    setSmsInput('');
    window.dispatchEvent(new Event('connections_updated'));
    logActivity('message_sent', `Sent SMS text to ${activeSender}: ${newMsg.content}`);
    toast.success('Message sent over SMS!');
  };

  const handleSmsAutoReply = (incomingText: string) => {
    const savedRules = localStorage.getItem('actionpilot_rules');
    if (!savedRules) return;
    
    try {
      const rules = JSON.parse(savedRules);
      const activeRules = rules.filter((r: any) => r.isActive && r.platform === 'SMS');
      
      const matchedRule = activeRules.find((rule: any) => {
        const trigger = rule.triggerEvent.toLowerCase();
        if (trigger.includes('birthday') && incomingText.toLowerCase().includes('birthday')) return true;
        if (trigger.includes('medication') && (incomingText.toLowerCase().includes('med') || incomingText.toLowerCase().includes('vitamin'))) return true;
        if (incomingText.toLowerCase().includes(trigger)) return true;
        return false;
      });

      if (matchedRule) {
        setTimeout(() => {
          const replyMsg = {
            id: (Date.now() + 1).toString(),
            platform: 'SMS' as const,
            sender: activeSender, // Outgoing rule triggers message as if received or responded by automated bot
            content: matchedRule.messageTemplate,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isRead: true
          };

          const currentMessages = JSON.parse(localStorage.getItem('actionpilot_messages') || '[]');
          const updatedWithReply = [...currentMessages, replyMsg];
          localStorage.setItem('actionpilot_messages', JSON.stringify(updatedWithReply));
          setSmsMessages(updatedWithReply);
          window.dispatchEvent(new Event('connections_updated'));
          logActivity('automation_triggered', `Automated reply sent over SMS: ${matchedRule.messageTemplate}`);
          toast.success(`🤖 Auto-Reply Triggered: "${matchedRule.name}"`, { icon: '⚡' });
        }, 1000);
      }
    } catch (e) {
      console.error("Auto-reply trigger error", e);
    }
  };

  const timerTask = tasks.find(t => t.id === activeTimerTaskId);

  return (
    <div className="space-y-8 pb-20 relative max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
      
      {/* Upper banner section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-border/40">
        <div>
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-semibold tracking-tight mb-2 text-foreground font-sans"
          >
            {getGreeting()}, {user.displayName?.split(' ')[0] || 'Executive'}
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground text-sm md:text-base font-medium flex items-center gap-2"
          >
            {pendingImportant > 0 
              ? <><AlertCircle className="w-4 h-4 text-amber-500" /> You have {pendingImportant} priority tasks due today. Let's conquer them.</>
              : <><Sparkles className="w-4 h-4 text-emerald-500" /> All clear. You are fully synced and ready for productivity.</>}
          </motion.p>
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-3 w-full md:w-auto"
        >
          <Button 
            onClick={() => navigate('/calendar')} 
            variant="outline" 
            className="flex-1 md:flex-none gap-2 font-medium bg-transparent border-border/60 hover:bg-muted/50 rounded-xl"
          >
            <CalendarDays className="w-4 h-4 text-muted-foreground" />
            Milestones
          </Button>

          <Button 
            onClick={() => window.dispatchEvent(new Event('open-task-modal'))} 
            className="flex-1 md:flex-none gap-2 font-medium shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
          >
            <Plus className="w-4 h-4" />
            New Task
          </Button>

          <div className="relative w-full md:w-64">
            <input 
              type="text" 
              placeholder="Search tasks..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-muted/50 border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <div className="absolute left-3 top-2.5 text-muted-foreground">
              <Search className="w-4 h-4" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Grid of stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        
        {/* Productivity Score */}
        <Card className="border-border/40 bg-card/40 backdrop-blur-md overflow-hidden relative group shadow-sm transition-all hover:shadow-md hover:bg-card/60 cursor-pointer select-none rounded-2xl" onClick={() => setShowProductivityDetails(!showProductivityDetails)}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <div>
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Productivity</CardTitle>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold tracking-tight">{stats.productivityScore}</div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                stats.productivityScore >= 90 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                stats.productivityScore >= 75 ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400' :
                stats.productivityScore >= 50 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-muted text-muted-foreground'
              }`}>
                {stats.productivityScore >= 90 ? 'Peak Focus' :
                 stats.productivityScore >= 75 ? 'Optimal' :
                 stats.productivityScore >= 50 ? 'Active' : 'Steady'}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 font-medium">
              {showProductivityDetails ? 'Click to collapse metrics' : 'Click to view breakdown'}
            </p>
            <div className="mt-4">
              <Progress value={Math.min(stats.productivityScore, 100)} className="h-1.5 rounded-full bg-secondary" />
            </div>

            <AnimatePresence initial={false}>
              {showProductivityDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden mt-4 pt-3 border-t border-border/40 space-y-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    This score measures efficiency and scheduling alignment across daily and long-term horizons:
                  </p>
                  
                  <div className="space-y-2">
                    {/* Today Component */}
                    <div>
                      <div className="flex justify-between text-[9px] font-semibold text-foreground mb-1">
                        <span>Daily Completed Tasks (40% weight)</span>
                        <span className="font-mono text-primary">
                          {totalToday > 0 ? `${completedToday}/${totalToday} (${Math.round(todayRate * 100)}%)` : '100% (No tasks)'}
                        </span>
                      </div>
                      <Progress value={todayRate * 100} className="h-1 bg-secondary [&>div]:bg-primary" />
                    </div>

                    {/* Overall Component */}
                    <div>
                      <div className="flex justify-between text-[9px] font-semibold text-foreground mb-1">
                        <span>Total Pipeline Progress (35% weight)</span>
                        <span className="font-mono text-primary">
                          {overallTotal > 0 ? `${overallCompleted}/${overallTotal} (${Math.round(overallRate * 100)}%)` : '100% (No tasks)'}
                        </span>
                      </div>
                      <Progress value={overallRate * 100} className="h-1 bg-secondary [&>div]:bg-primary" />
                    </div>

                    {/* High Priority Component */}
                    <div>
                      <div className="flex justify-between text-[9px] font-semibold text-foreground mb-1">
                        <span>Priority Focus Rate (25% weight)</span>
                        <span className="font-mono text-primary">
                          {highPriorityTasks.length > 0 ? `${highPriorityCompleted}/${highPriorityTasks.length} (${Math.round(highPriorityRate * 100)}%)` : '100% (Clean slate)'}
                        </span>
                      </div>
                      <Progress value={highPriorityRate * 100} className="h-1 bg-secondary [&>div]:bg-primary" />
                    </div>
                  </div>

                  <div className="bg-secondary/40 p-2 rounded text-[9px] text-muted-foreground leading-tight">
                    💡 <span className="font-semibold text-foreground">Tip:</span> Complete high priority tasks and check off scheduled events to raise your score!
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Automations Status */}
        <Card className="border-border/40 bg-card/40 backdrop-blur-md overflow-hidden relative group shadow-sm transition-all hover:shadow-md hover:bg-card/60 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Auto-Replies</CardTitle>
            <div className="w-8 h-8 rounded-full bg-pink-500/10 flex items-center justify-center text-pink-500 group-hover:scale-110 transition-transform">
              <Zap className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-pink-500 tracking-tight">Active</div>
            <p className="text-[11px] text-muted-foreground mt-2 font-medium">Multi-channel response bot is live</p>
            <div className="mt-4">
              <Button variant="secondary" size="sm" className="w-full text-xs h-8 font-medium rounded-xl" onClick={() => navigate('/automations')}>
                Manage Automations
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Focus Time */}
        <Card className="border-border/40 bg-card/40 backdrop-blur-md overflow-hidden relative group shadow-sm transition-all hover:shadow-md hover:bg-card/60 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Focus Time</CardTitle>
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
              <Target className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">
              {Math.floor(stats.focusMinutes / 60)}h {stats.focusMinutes % 60}m
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 font-medium">Daily Goal: 3 hours focus</p>
            <div className="mt-4">
              <Progress value={(stats.focusMinutes / 180) * 100} className="h-1.5 rounded-full bg-secondary [&>div]:bg-blue-500" />
            </div>
          </CardContent>
        </Card>

        {/* Task Progress */}
        <Card className="border-border/40 bg-card/40 backdrop-blur-md overflow-hidden relative group shadow-sm transition-all hover:shadow-md hover:bg-card/60 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Daily Completion</CardTitle>
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
              <CheckSquare className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-500 tracking-tight">{completionPercentage}%</div>
            <p className="text-[11px] text-muted-foreground mt-2 font-medium">
              {stats.tasksCompletedToday} of {stats.totalTasksToday} tasks finished
            </p>
            <div className="mt-4">
              <Progress value={completionPercentage} className="h-1.5 rounded-full bg-secondary [&>div]:bg-emerald-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Long-Term Horizon Portfolio Grid */}
      <div className="mt-6">
        <h3 className="text-xs font-bold text-muted-foreground tracking-widest uppercase mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Long-Term Scheduling Horizon & Metrics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Yearly Portfolio */}
          <Card className="border-border/50 bg-gradient-to-br from-indigo-500/5 to-card overflow-hidden relative group shadow-sm transition-all hover:shadow-md border-l-4 border-l-indigo-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Yearly Portfolio</CardTitle>
              <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <CalendarDays className="w-4.5 h-4.5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold tracking-tight">
                {totalTasksThisYear} <span className="text-xs text-muted-foreground font-normal">tasks</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Award className="w-3 h-3 text-indigo-400" />
                {yearlyCompletionRate}% completed in {currentYear}
              </p>
              <div className="mt-4">
                <Progress value={yearlyCompletionRate} className="h-1.5 [&>div]:bg-indigo-500" />
              </div>
            </CardContent>
          </Card>

          {/* Monthly Momentum */}
          <Card className="border-border/50 bg-gradient-to-br from-emerald-500/5 to-card overflow-hidden relative group shadow-sm transition-all hover:shadow-md border-l-4 border-l-emerald-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Monthly Momentum</CardTitle>
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <Target className="w-4.5 h-4.5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold tracking-tight">
                {totalTasksThisMonth} <span className="text-xs text-muted-foreground font-normal">scheduled</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <CheckSquare className="w-3 h-3 text-emerald-400" />
                {monthlyCompletionRate}% rate this month
              </p>
              <div className="mt-4">
                <Progress value={monthlyCompletionRate} className="h-1.5 [&>div]:bg-emerald-500" />
              </div>
            </CardContent>
          </Card>

          {/* AI Optimizer Ratio */}
          <Card className="border-border/50 bg-gradient-to-br from-purple-500/5 to-card overflow-hidden relative group shadow-sm transition-all hover:shadow-md border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">AI Delegation Ratio</CardTitle>
              <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400">
                <Sparkles className="w-4.5 h-4.5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold tracking-tight">{aiScheduledRatio}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {aiGeneratedCount} of {totalTasksCount} tasks are AI-optimized
              </p>
              <div className="mt-4">
                <Progress value={aiScheduledRatio} className="h-1.5 [&>div]:bg-purple-500" />
              </div>
            </CardContent>
          </Card>

          {/* Milestones & Celebrations */}
          <Card className="border-border/50 bg-gradient-to-br from-pink-500/5 to-card overflow-hidden relative group shadow-sm transition-all hover:shadow-md border-l-4 border-l-pink-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Month Celebrations</CardTitle>
              <div className="w-8 h-8 rounded-full bg-pink-500/10 flex items-center justify-center text-pink-400">
                <Gift className="w-4.5 h-4.5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold tracking-tight">
                {totalBirthdaysThisMonth} <span className="text-xs text-muted-foreground font-normal">active</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Birthdays & anniversaries in {new Date().toLocaleDateString(undefined, { month: 'long' })}
              </p>
              <div className="mt-4">
                <Button variant="secondary" size="sm" className="w-full text-xs h-7 font-bold hover:bg-pink-500/10 hover:text-pink-400 transition-colors" onClick={() => navigate('/calendar')}>
                  View Birthday Calendars
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Main Focus / Focus Timer Panel */}
      <AnimatePresence mode="wait">
        {activeTimerTaskId && timerTask ? (
          /* Real-time Focus Timer Display */
          <motion.div
            key="timer"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-lg"
          >
            <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
              <Clock className="w-36 h-36 text-blue-500" />
            </div>

            <div className="flex flex-col md:flex-row items-center gap-6 z-10 w-full md:w-auto">
              {/* Countdown Circle Simulation */}
              <div className="w-24 h-24 rounded-full border-4 border-blue-500/20 border-t-blue-500 flex items-center justify-center animate-spin-slow bg-card shadow-inner shrink-0">
                <span className="text-xl font-extrabold text-blue-500 tracking-tight font-mono animate-none">
                  {formatTime(timeLeft)}
                </span>
              </div>

              <div className="text-center md:text-left space-y-2 min-w-0">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider">
                  ⏱️ Focus Session Active
                </span>
                <h3 className="text-xl font-bold tracking-tight text-foreground truncate max-w-md">
                  {timerTask.title}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Stay focused and keep this tab open. Your daily statistics are recording.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 z-10 shrink-0">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={toggleTimer} 
                className="gap-1.5 font-bold border-blue-500/30 hover:bg-blue-500/10 text-blue-600 dark:text-blue-400"
              >
                {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isTimerRunning ? "Pause" : "Resume"}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setTimeLeft((timerTask.estimatedMinutes || 25) * 60)}
                className="h-9 w-9 p-0 text-muted-foreground"
                title="Restart Session"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button 
                size="sm" 
                onClick={handleCompleteTimerTask} 
                className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                <Check className="w-4 h-4" />
                Done
              </Button>
            </div>
          </motion.div>
        ) : focusTask.task ? (
          /* Normal AI Focus Task Display */
          <motion.div
            key="focus"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Card className="border-primary/30 bg-primary/5 relative overflow-hidden shadow-md">
              <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                <Target className="w-32 h-32 text-primary" />
              </div>
              <CardContent className="p-6 md:p-8 relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      AI Focus Priority
                    </span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight text-foreground">{focusTask.task.title}</h3>
                    {focusTask.reason && (
                      <p className="text-muted-foreground mt-1 max-w-2xl text-sm leading-relaxed">
                        {focusTask.reason}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0 flex flex-col items-end gap-3 w-full md:w-auto">
                  <div className="flex gap-2 w-full md:w-auto justify-end">
                    <Button variant="outline" size="sm" className="text-xs font-semibold" onClick={handleSkipFocusTask}>
                      Skip
                    </Button>
                    <Button 
                      size="sm" 
                      className="shadow-md text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground" 
                      onClick={() => startFocusTimer(focusTask.task!)}
                    >
                      <Play className="w-3.5 h-3.5 mr-1" />
                      Start Focus Session
                    </Button>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 font-semibold">
                      <Clock className="w-3.5 h-3.5 text-primary" /> {focusTask.task.estimatedMinutes} mins
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase ${
                      focusTask.task.priority === 'High' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                      focusTask.task.priority === 'Medium' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                      'bg-green-500/10 text-green-500 border-green-500/20'
                    }`}>{focusTask.task.priority}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Today's Schedule timeline */}
        <Card className="lg:col-span-2 border-border/50 bg-card/60 backdrop-blur-sm shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 pb-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Zap className="w-5 h-5 text-yellow-500 font-bold" />
                Today's Schedule & Routine
              </CardTitle>
              <CardDescription className="text-xs">
                Your dynamically optimized chronological routine.
              </CardDescription>
            </div>
            {getTodaySchedule().filter(item => item.title.toLowerCase().includes(searchQuery.toLowerCase())).length > 0 && (
              <span className="text-[10px] bg-primary/10 text-primary font-bold px-2.5 py-1 rounded-full border border-primary/10">
                ● Live Map
              </span>
            )}
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              {getTodaySchedule().filter(item => item.title.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                <div className="text-center py-12 px-4 border border-dashed border-border rounded-xl bg-secondary/10 animate-in fade-in">
                  <Sparkles className="w-8 h-8 text-primary/40 mx-auto mb-3 animate-pulse" />
                  <h3 className="text-sm font-bold text-foreground">No scheduled tasks or routines today</h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    Map out your day! Set today's tasks, log daily medications, schedule stretching intervals, or configure wellness reminders in settings.
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => window.dispatchEvent(new Event('open-task-modal'))} 
                      className="text-xs font-semibold bg-primary hover:bg-primary/90"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add Task
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => navigate('/settings')} 
                      className="text-xs font-semibold"
                    >
                      Configure Routines
                    </Button>
                  </div>
                </div>
              ) : (
                getTodaySchedule().filter(item => item.title.toLowerCase().includes(searchQuery.toLowerCase())).map((slot, i, arr) => {
                  const energy = getEnergyLevel(slot.sortMinutes);
                  const isTask = slot.type === 'task';
                  
                  return (
                    <div key={slot.id} className="flex gap-4 relative group">
                      {/* Timeline connectors */}
                      {i !== arr.length - 1 && (
                        <div className="absolute left-16 top-10 bottom-[-24px] w-[2px] bg-border/40 group-hover:bg-primary/20 transition-colors" />
                      )}
                      
                      {/* Time label */}
                      <div className="w-16 text-xs font-bold text-muted-foreground pt-1 flex-shrink-0 text-right">
                        {slot.time}
                      </div>

                      {/* Bullet indicator with dynamic icons */}
                      <div className={`w-8 h-8 rounded-full z-10 flex-shrink-0 flex items-center justify-center transition-all ${
                        slot.status === 'completed' 
                          ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/10' 
                          : slot.id === activeTimerTaskId
                            ? 'bg-blue-500 text-white ring-4 ring-blue-500/20 shadow-[0_0_8px_rgba(59,130,246,0.5)]'
                            : slot.type === 'medication'
                              ? 'bg-red-500/15 text-red-500 border border-red-500/30'
                              : slot.type === 'water'
                                ? 'bg-blue-500/15 text-blue-500 border border-blue-500/30'
                                : slot.type === 'stretch'
                                  ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                                  : slot.type === 'event'
                                    ? 'bg-purple-500/15 text-purple-500 border border-purple-500/30'
                                    : 'bg-muted border border-border group-hover:border-primary/50'
                      }`}>
                        {slot.status === 'completed' ? (
                          <Check className="w-4 h-4 stroke-[3]" />
                        ) : slot.type === 'medication' ? (
                          <Pill className="w-4 h-4" />
                        ) : slot.type === 'water' ? (
                          <Droplets className="w-4 h-4" />
                        ) : slot.type === 'stretch' ? (
                          <Activity className="w-4 h-4" />
                        ) : slot.type === 'event' ? (
                          <Star className="w-4 h-4" />
                        ) : (
                          <CheckSquare className="w-4 h-4" />
                        )}
                      </div>

                      {/* Event box with custom theme border / bg */}
                      <div className={`flex-1 p-4 rounded-xl border transition-all ${
                        slot.id === activeTimerTaskId
                          ? 'border-blue-500/40 bg-blue-500/5 shadow-inner'
                          : slot.status === 'completed'
                            ? 'border-border/30 bg-muted/10 opacity-75'
                            : slot.type === 'medication'
                              ? 'border-red-500/10 bg-red-500/5 hover:border-red-500/20'
                              : slot.type === 'water'
                                ? 'border-blue-500/10 bg-blue-500/5 hover:border-blue-500/20'
                                : slot.type === 'stretch'
                                  ? 'border-amber-500/10 bg-amber-500/5 hover:border-amber-500/20'
                                  : slot.type === 'event'
                                    ? 'border-purple-500/15 bg-purple-500/5 hover:border-purple-500/25'
                                    : 'border-border/50 bg-card/40 hover:border-border hover:bg-card/70 hover:shadow-sm'
                      }`}>
                        <div className="flex justify-between items-start gap-3 mb-1">
                          <div className="min-w-0">
                            <h4 className={`font-bold text-sm leading-snug ${
                              slot.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'
                            }`}>
                              {slot.title}
                            </h4>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-muted rounded-md text-muted-foreground whitespace-nowrap">
                            {slot.duration}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground mt-3">
                          <div className="flex items-center gap-2">
                            {slot.priority && (
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider border ${
                                slot.priority === 'High' ? 'bg-destructive/10 text-destructive border-destructive/10' :
                                slot.priority === 'Medium' ? 'bg-orange-500/10 text-orange-600 border-orange-500/10' :
                                'bg-emerald-500/10 text-emerald-600 border-emerald-500/10'
                              }`}>
                                {slot.priority} Urgency
                              </span>
                            )}
                            
                            {/* Dynamic Energy Level indicator based on slot sorting */}
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${energy.color}`}>
                              ⚡ {energy.label} ({energy.percent}%)
                            </span>
                          </div>

                          {/* Routine & Task completion controls */}
                          {slot.status !== 'completed' && (
                            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              {isTask ? (
                                <>
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-7 px-2 text-xs font-bold text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700"
                                    onClick={() => completeTask(slot.id)}
                                  >
                                    <Check className="w-3.5 h-3.5 mr-1" />
                                    Complete
                                  </Button>
                                  {slot.id !== activeTimerTaskId && (
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      className="h-7 px-2 text-xs font-bold text-blue-600 hover:bg-blue-500/10 hover:text-blue-700"
                                      onClick={() => slot.taskRef && startFocusTimer(slot.taskRef)}
                                    >
                                      <Play className="w-3 h-3 mr-1" />
                                      Focus
                                    </Button>
                                  )}
                                </>
                              ) : (
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-7 px-2 text-xs font-bold text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700"
                                  onClick={() => {
                                    logActivity('routine_completed', `Finished scheduled routine: ${slot.title}`);
                                    toast.success(`Completed: ${slot.title}`, { icon: '✅' });
                                    // Set routine as completed in dashboard transient state
                                    setTasks(prev => [...prev]); // trigger state update to force re-render
                                  }}
                                >
                                  <Check className="w-3.5 h-3.5 mr-1" />
                                  Check Off
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sidebar cards */}
        <div className="space-y-6">
          
          {/* Local SMS & Phone Terminal Simulator */}
          <Card className="border-border/50 bg-card/60 backdrop-blur-sm shadow-xl overflow-hidden relative">
            <CardHeader className="pb-3 border-b border-border/10 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
                  <Smartphone className="w-4.5 h-4.5" />
                  Local SMS & Phone Station
                </CardTitle>
                <CardDescription className="text-[10px]">
                  Simulated local device receiver & sender.
                </CardDescription>
              </div>
              {smsPermission && (
                <span className="text-[9px] bg-emerald-500/15 text-emerald-600 font-bold px-2 py-0.5 rounded border border-emerald-500/10">
                  Synced
                </span>
              )}
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {!smsPermission ? (
                /* Permission Prompt */
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
                    <Smartphone className="w-5 h-5 animate-bounce-slow" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-xs">Device Message Permission Needed</p>
                    <p className="text-[10px] text-muted-foreground leading-normal">
                      Grant local browser device permission to securely sync and receive SMS alerts from contacts like Mom or Client Support.
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => {
                      localStorage.setItem('actionpilot_sms_permission_granted', 'true');
                      localStorage.setItem('actionpilot_connected_sms', 'true');
                      setSmsPermission(true);
                      setSmsConnected(true);
                      window.dispatchEvent(new Event('connections_updated'));
                      logActivity('connection_established', 'Granted Local SMS & Phone device notifications permission');
                      toast.success('Local Device SMS Permission Granted!');
                    }}
                    className="w-full text-xs font-bold bg-primary hover:bg-primary/90"
                  >
                    <UserCheck className="w-3.5 h-3.5 mr-1" /> Grant Local Permission
                  </Button>
                </div>
              ) : (
                /* Fully Interactive Chat Simulator */
                <div className="space-y-3">
                  {/* Sender selector tab */}
                  <div className="flex items-center gap-1.5 p-1 bg-secondary/60 rounded-lg border border-border/40">
                    {['Mom', '+1 555-0198', 'Client Support'].map(sender => (
                      <button
                        key={sender}
                        onClick={() => setActiveSender(sender)}
                        className={`flex-1 text-[10px] font-bold py-1 px-2 rounded-md transition-colors truncate ${
                          activeSender === sender 
                            ? 'bg-background text-foreground shadow-sm' 
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                        title={sender}
                      >
                        {sender}
                      </button>
                    ))}
                  </div>

                  {/* Message History area */}
                  <div className="h-[180px] overflow-y-auto border border-border/40 bg-secondary/20 rounded-lg p-3 space-y-2.5 flex flex-col font-sans">
                    {smsMessages.filter(m => m.platform === 'SMS' && (m.sender === activeSender || (m.sender === 'You' && localStorage.getItem(`last_sender_to_${m.id}`) === activeSender) || (m.sender === 'You' && !localStorage.getItem(`last_sender_to_${m.id}`)))).length === 0 ? (
                      <div className="text-center my-auto text-[10px] text-muted-foreground">
                        No text messages with {activeSender} yet. Send a text below!
                      </div>
                    ) : (
                      smsMessages
                        .filter(m => m.platform === 'SMS' && (m.sender === activeSender || m.sender === 'You'))
                        .map(msg => (
                          <div
                            key={msg.id}
                            className={`p-2.5 rounded-lg max-w-[85%] text-xs leading-normal ${
                              msg.sender === 'You' 
                                ? 'bg-primary text-primary-foreground self-end'
                                : 'bg-muted border border-border/40 self-start text-foreground'
                            }`}
                          >
                            <p className="text-[10px] opacity-75 mb-0.5 font-bold">
                              {msg.sender === 'You' ? 'You' : msg.sender}
                            </p>
                            <p className="break-words font-medium">{msg.content}</p>
                            <span className="text-[8px] opacity-60 block text-right mt-1 font-mono">
                              {msg.time}
                            </span>
                          </div>
                        ))
                    )}
                  </div>

                  {/* Action input bar */}
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder={`Text ${activeSender}...`}
                      value={smsInput}
                      onChange={(e) => setSmsInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSendSms();
                        }
                      }}
                      className="flex-1 bg-secondary border border-border/40 rounded-lg px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                    />
                    <Button 
                      size="icon" 
                      onClick={handleSendSms}
                      className="h-8 w-8 shrink-0 bg-primary hover:bg-primary/90"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {/* Simulate Incoming trigger */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const triggerText = activeSender === 'Mom' 
                        ? 'Did you check off your medication reminder honey?' 
                        : activeSender === 'Client Support'
                          ? 'I need help with my integration API keys, please respond!'
                          : 'Hey, sending over today\'s scheduling priority details.';
                          
                      const newMsg = {
                        id: Date.now().toString(),
                        platform: 'SMS' as const,
                        sender: activeSender,
                        content: triggerText,
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        isRead: false
                      };
                      
                      const updated = [...smsMessages, newMsg];
                      localStorage.setItem('actionpilot_messages', JSON.stringify(updated));
                      setSmsMessages(updated);
                      window.dispatchEvent(new Event('connections_updated'));
                      
                      // Speak incoming message if voice alerts are on
                      if (localStorage.getItem('actionpilot_voice_alerts') === 'true') {
                        const spokenText = `New text from ${activeSender}: ${triggerText}`;
                        const utterance = new SpeechSynthesisUtterance(spokenText);
                        window.speechSynthesis.speak(utterance);
                      }
                      
                      toast.success(`Incoming text from ${activeSender}!`, { icon: '💬' });

                      // Check automations
                      handleSmsAutoReply(triggerText);
                    }}
                    className="w-full text-[10px] font-bold h-7 gap-1 hover:bg-primary/5 hover:text-primary border-primary/20"
                  >
                    <Activity className="w-3 h-3 text-emerald-500 animate-pulse" /> Simulate Incoming from {activeSender}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Daily AI summary */}
          <DailyDigestWidget />

          {/* Special Birthday Milestone Prompt - Proactively reminding users! */}
          {birthdaysThisWeek.length > 0 && (
            <Card className="border-pink-500/30 bg-pink-500/5 dark:bg-pink-950/10 shadow-lg relative overflow-hidden animate-pulse-slow">
              <div className="absolute -right-4 -bottom-4 opacity-10">
                <Cake className="w-24 h-24 text-pink-500" />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-pink-600 dark:text-pink-400">
                  <Cake className="w-4 h-4" />
                  Upcoming Birthdays This Week!
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs leading-normal">
                <p className="text-muted-foreground font-medium">
                  We detected milestone dates approaching in the next 7 days. Make sure to send wishes:
                </p>
                <div className="space-y-2">
                  {birthdaysThisWeek.map(b => (
                    <div key={b.id} className="p-2.5 rounded-lg bg-card/80 border border-pink-500/10 flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="font-bold text-foreground truncate">{b.name}</p>
                        <p className="text-[10px] text-pink-500 capitalize">{b.type}</p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-6 text-[10px] font-bold text-pink-600 hover:bg-pink-500/10 px-2"
                        onClick={() => navigate('/calendar')}
                      >
                        Gift Ideas
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Coach Insights */}
          <Card className="border-border/50 bg-card/60 backdrop-blur-sm shadow-xl">
            <CardHeader className="pb-4 border-b border-border/10">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
                <Brain className="w-4.5 h-4.5" />
                AI Coach Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/15 text-xs">
                <p className="font-bold text-foreground mb-1">Weekly Momentum</p>
                <p className="text-muted-foreground leading-relaxed">
                  Your productivity score is currently outstanding. If you handle high-urgency tasks prior to lunch tomorrow, you will enjoy a relaxed work-free weekend.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/15 text-xs">
                <p className="font-bold text-foreground mb-1">Integration Recommendation</p>
                <p className="text-muted-foreground leading-relaxed">
                  Your SMS/WhatsApp channel remains linked but unscheduled. Write a simple rule in the Automations tab to auto-reply to clients!
                </p>
              </div>
            </CardContent>
          </Card>
          
          {/* Visual Analytics Hub Widget */}
          <Card className="border-border/50 bg-card/60 backdrop-blur-sm shadow-xl">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Activity className="w-4.5 h-4.5 text-primary" />
                  Visual Analytics Hub
                </CardTitle>
                <div className="flex items-center gap-1 bg-secondary/80 p-0.5 rounded-lg border border-border/40">
                  <button
                    onClick={() => setActiveChartTab('urgency')}
                    className={`text-[10px] font-bold px-2 py-1 rounded-md transition-colors ${
                      activeChartTab === 'urgency' ? 'bg-background text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Urgency
                  </button>
                  <button
                    onClick={() => setActiveChartTab('lifecycle')}
                    className={`text-[10px] font-bold px-2 py-1 rounded-md transition-colors ${
                      activeChartTab === 'lifecycle' ? 'bg-background text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Lifecycle
                  </button>
                </div>
              </div>
              <CardDescription className="text-xs">
                {activeChartTab === 'urgency' ? 'Active tasks split by urgency.' : 'Complete scheduling pipeline analysis.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeChartTab === 'urgency' ? (
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value: number) => [`${value} Task${value > 1 ? 's' : ''}`, '']}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36} 
                        iconType="circle"
                        formatter={(value) => <span className="text-xs text-foreground font-semibold">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analysisChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" tick={{ fill: '#888888', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#888888', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <RechartsTooltip 
                        formatter={(value: number) => [`${value} Task${value > 1 ? 's' : ''}`, 'Count']}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {analysisChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <ActivityLogWidget />
        </div>
      </div>
      
      {/* Voice FAB */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.6, type: 'spring', stiffness: 200, damping: 20 }}
        className="fixed bottom-44 right-6 md:bottom-6 md:right-44 z-50 flex flex-col items-end gap-2"
      >
        <AnimatePresence>
          {showVoiceMenu && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="bg-card text-card-foreground p-1.5 rounded-xl shadow-2xl border border-border flex flex-col gap-1 w-52 mb-2 z-50"
            >
              <button
                onClick={() => {
                  setShowVoiceMenu(false);
                  toggleVoiceRecording();
                }}
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg hover:bg-primary/10 hover:text-primary transition-all text-left w-full text-foreground"
              >
                <Mic className="w-4 h-4 text-primary" />
                <span>🎤 Voice Task Creator</span>
              </button>
              <button
                onClick={() => {
                  setShowVoiceMenu(false);
                  window.dispatchEvent(new Event('open-agent-hud'));
                }}
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg hover:bg-indigo-500/10 hover:text-indigo-400 transition-all text-left w-full text-foreground"
              >
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>🎙️ AI Voice Task Assistant</span>
              </button>
            </motion.div>
          )}

          {(isRecording || voiceText) && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="bg-card text-card-foreground p-3 rounded-lg shadow-xl border border-border max-w-[250px] mb-2"
            >
              <div className="flex items-center gap-2 mb-1">
                <Mic className="w-4 h-4 text-primary animate-pulse" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Listening...</span>
              </div>
              <p className="text-sm">{voiceText || "Speak now to create a task..."}</p>
            </motion.div>
          )}
        </AnimatePresence>
        <Button 
          size="icon" 
          variant={isRecording ? "destructive" : "default"}
          className={`w-14 h-14 rounded-full shadow-lg transition-all ${isRecording ? 'animate-pulse' : 'shadow-primary/30'}`}
          onClick={() => {
            if (isRecording) {
              toggleVoiceRecording();
            } else {
              setShowVoiceMenu(!showVoiceMenu);
            }
          }}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Mic className="w-6 h-6" />}
        </Button>
      </motion.div>

      {/* Manual Task Add FAB */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 200, damping: 20 }}
        className="fixed bottom-24 right-6 md:bottom-6 md:right-24 z-50"
      >
        <Button 
          size="icon" 
          className="w-14 h-14 rounded-full shadow-lg shadow-primary/30"
          onClick={() => window.dispatchEvent(new Event('open-task-modal'))}
        >
          <Plus className="w-6 h-6" />
        </Button>
      </motion.div>

    </div>
  );
}
