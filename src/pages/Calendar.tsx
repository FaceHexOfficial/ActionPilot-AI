import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  Link as LinkIcon, 
  Download, 
  Cake, 
  Gift, 
  Bell, 
  Trash2, 
  Plus, 
  PlusCircle, 
  CalendarPlus, 
  CalendarHeart,
  ChevronDown,
  Info,
  Check,
  CheckSquare,
  Square,
  Sparkles,
  Filter,
  Globe,
  CalendarDays,
  X,
  PartyPopper
} from 'lucide-react';
import { 
  addDays, 
  format, 
  startOfWeek, 
  endOfWeek, 
  isSameDay, 
  parseISO, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth,
  addMonths
} from 'date-fns';
import { toast } from 'react-hot-toast';
import { Task } from '../types';
import { getTaskDateString } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface BirthdayReminder {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  type: 'birthday' | 'anniversary' | 'reminder';
  notes?: string;
  notify?: boolean;
}

interface Holiday {
  name: string;
  date: string; // YYYY-MM-DD
  category: 'holiday' | 'festival';
  description?: string;
}

// Curated comprehensive global & Indian holidays / festivals for 2025, 2026, 2027
const HOLIDAYS_DATA: Record<number, Holiday[]> = {
  2025: [
    { name: "New Year's Day", date: "2025-01-01", category: "holiday", description: "Global celebration of the New Year" },
    { name: "Republic Day (India)", date: "2025-01-26", category: "holiday", description: "Honoring the Constitution of India" },
    { name: "Valentine's Day", date: "2025-02-14", category: "festival", description: "Celebration of romance and love" },
    { name: "Holi Festival", date: "2025-03-14", category: "festival", description: "Hindu festival of colors, spring, and love" },
    { name: "St. Patrick's Day", date: "2025-03-17", category: "festival", description: "Irish cultural and religious celebration" },
    { name: "Eid al-Fitr", date: "2025-03-31", category: "festival", description: "Islamic festival marking the end of Ramadan" },
    { name: "Good Friday", date: "2025-04-18", category: "holiday", description: "Christian commemoration of the Passion and crucifixion" },
    { name: "Easter Sunday", date: "2025-04-20", category: "festival", description: "Christian festival celebrating the resurrection" },
    { name: "Earth Day", date: "2025-04-22", category: "festival", description: "Global event supporting environmental protection" },
    { name: "Labor Day / May Day", date: "2025-05-01", category: "holiday", description: "International workers' day" },
    { name: "Eid al-Adha", date: "2025-06-07", category: "festival", description: "Islamic festival of sacrifice" },
    { name: "Independence Day (US)", date: "2025-07-04", category: "holiday", description: "US Independence Day" },
    { name: "Independence Day (India)", date: "2025-08-15", category: "holiday", description: "India Independence Day" },
    { name: "Raksha Bandhan", date: "2025-08-09", category: "festival", description: "Celebrating the bond between brothers and sisters" },
    { name: "Janmashtami", date: "2025-09-04", category: "festival", description: "Hindu festival celebrating the birth of Krishna" },
    { name: "Halloween", date: "2025-10-31", category: "festival", description: "All Hallows' Eve celebration" },
    { name: "Diwali (Deepavali)", date: "2025-10-20", category: "festival", description: "Hindu festival of lights, representing victory of light over darkness" },
    { name: "Thanksgiving (US)", date: "2025-11-27", category: "holiday", description: "National holiday of giving thanks" },
    { name: "Christmas Eve", date: "2025-12-24", category: "holiday", description: "Day before Christmas" },
    { name: "Christmas Day", date: "2025-12-25", category: "holiday", description: "Christian celebration of the Nativity of Jesus" },
    { name: "New Year's Eve", date: "2025-12-31", category: "festival", description: "Last day of the Gregorian year" }
  ],
  2026: [
    { name: "New Year's Day", date: "2026-01-01", category: "holiday", description: "Global celebration of the New Year" },
    { name: "Republic Day (India)", date: "2026-01-26", category: "holiday", description: "Honoring the Constitution of India" },
    { name: "Valentine's Day", date: "2026-02-14", category: "festival", description: "Celebration of romance and love" },
    { name: "Holi Festival", date: "2026-03-03", category: "festival", description: "Hindu festival of colors, spring, and love" },
    { name: "St. Patrick's Day", date: "2026-03-17", category: "festival", description: "Irish cultural and religious celebration" },
    { name: "Eid al-Fitr", date: "2026-03-20", category: "festival", description: "Islamic festival marking the end of Ramadan" },
    { name: "Good Friday", date: "2026-04-03", category: "holiday", description: "Christian commemoration of the Passion and crucifixion" },
    { name: "Easter Sunday", date: "2026-04-05", category: "festival", description: "Christian festival celebrating the resurrection" },
    { name: "Earth Day", date: "2026-04-22", category: "festival", description: "Global event supporting environmental protection" },
    { name: "Labor Day / May Day", date: "2026-05-01", category: "holiday", description: "International workers' day" },
    { name: "Eid al-Adha", date: "2026-05-27", category: "festival", description: "Islamic festival of sacrifice" },
    { name: "Independence Day (US)", date: "2026-07-04", category: "holiday", description: "US Independence Day" },
    { name: "Independence Day (India)", date: "2026-08-15", category: "holiday", description: "India Independence Day" },
    { name: "Raksha Bandhan", date: "2026-08-28", category: "festival", description: "Celebrating the bond between brothers and sisters" },
    { name: "Janmashtami", date: "2026-09-04", category: "festival", description: "Hindu festival celebrating the birth of Krishna" },
    { name: "Halloween", date: "2026-10-31", category: "festival", description: "All Hallows' Eve celebration" },
    { name: "Diwali (Deepavali)", date: "2026-11-08", category: "festival", description: "Hindu festival of lights, representing victory of light over darkness" },
    { name: "Thanksgiving (US)", date: "2026-11-26", category: "holiday", description: "National holiday of giving thanks" },
    { name: "Christmas Eve", date: "2026-12-24", category: "holiday", description: "Day before Christmas" },
    { name: "Christmas Day", date: "2026-12-25", category: "holiday", description: "Christian celebration of the Nativity of Jesus" },
    { name: "New Year's Eve", date: "2026-12-31", category: "festival", description: "Last day of the Gregorian year" }
  ],
  2027: [
    { name: "New Year's Day", date: "2027-01-01", category: "holiday", description: "Global celebration of the New Year" },
    { name: "Republic Day (India)", date: "2027-01-26", category: "holiday", description: "Honoring the Constitution of India" },
    { name: "Valentine's Day", date: "2027-02-14", category: "festival", description: "Celebration of romance and love" },
    { name: "Holi Festival", date: "2027-03-22", category: "festival", description: "Hindu festival of colors, spring, and love" },
    { name: "St. Patrick's Day", date: "2027-03-17", category: "festival", description: "Irish cultural and religious celebration" },
    { name: "Eid al-Fitr", date: "2027-03-09", category: "festival", description: "Islamic festival marking the end of Ramadan" },
    { name: "Good Friday", date: "2027-03-26", category: "holiday", description: "Christian commemoration of the Passion and crucifixion" },
    { name: "Easter Sunday", date: "2027-03-28", category: "festival", description: "Christian festival celebrating the resurrection" },
    { name: "Earth Day", date: "2027-04-22", category: "festival", description: "Global event supporting environmental protection" },
    { name: "Labor Day / May Day", date: "2027-05-01", category: "holiday", description: "International workers' day" },
    { name: "Eid al-Adha", date: "2027-05-17", category: "festival", description: "Islamic festival of sacrifice" },
    { name: "Independence Day (US)", date: "2027-07-04", category: "holiday", description: "US Independence Day" },
    { name: "Independence Day (India)", date: "2027-08-15", category: "holiday", description: "India Independence Day" },
    { name: "Raksha Bandhan", date: "2027-08-17", category: "festival", description: "Celebrating the bond between brothers and sisters" },
    { name: "Janmashtami", date: "2027-08-25", category: "festival", description: "Hindu festival celebrating the birth of Krishna" },
    { name: "Halloween", date: "2027-10-31", category: "festival", description: "All Hallows' Eve celebration" },
    { name: "Diwali (Deepavali)", date: "2027-10-29", category: "festival", description: "Hindu festival of lights, representing victory of light over darkness" },
    { name: "Thanksgiving (US)", date: "2027-11-25", category: "holiday", description: "National holiday of giving thanks" },
    { name: "Christmas Eve", date: "2027-12-24", category: "holiday", description: "Day before Christmas" },
    { name: "Christmas Day", date: "2027-12-25", category: "holiday", description: "Christian celebration of the Nativity of Jesus" },
    { name: "New Year's Eve", date: "2027-12-31", category: "festival", description: "Last day of the Gregorian year" }
  ]
};

// Robust local timezone helpers
const getLocalDateString = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const parseDueDateToLocalDate = (dueDateStr: string): Date | null => {
  if (!dueDateStr) return null;
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dueDateStr.trim())) {
      const [year, month, day] = dueDateStr.trim().split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    const dateObj = new Date(dueDateStr);
    if (!isNaN(dateObj.getTime())) {
      return dateObj;
    }
    return null;
  } catch (e) {
    return null;
  }
};

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('month');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [birthdays, setBirthdays] = useState<BirthdayReminder[]>([]);
  
  // Custom Filter State
  const [filterMode, setFilterMode] = useState<'all' | 'tasks' | 'milestones' | 'holidays'>('all');
  
  // Sidebar Tab State
  const [sidebarTab, setSidebarTab] = useState<'milestones' | 'holidays'>('milestones');

  // Modal / Day Inspector States
  const [isAddBdayOpen, setIsAddBdayOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDayDetailsOpen, setIsDayDetailsOpen] = useState(false);

  // Quick Add State inside Inspector
  const [quickFormType, setQuickFormType] = useState<'none' | 'task' | 'milestone'>('none');
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickTaskPriority, setQuickTaskPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [quickTaskCategory, setQuickTaskCategory] = useState('General');
  const [quickTaskMins, setQuickTaskMins] = useState(30);

  const [quickMilestoneName, setQuickMilestoneName] = useState('');
  const [quickMilestoneType, setQuickMilestoneType] = useState<'birthday' | 'anniversary' | 'reminder'>('reminder');
  const [quickMilestoneNotes, setQuickMilestoneNotes] = useState('');

  const [bdayForm, setBdayForm] = useState<Omit<BirthdayReminder, 'id'>>({
    name: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    type: 'birthday',
    notes: '',
    notify: true
  });

  // Local activity logger
  const logCalendarActivity = (message: string) => {
    const activityLog = localStorage.getItem('actionpilot_activities') || '[]';
    try {
      const logs = JSON.parse(activityLog);
      logs.unshift({
        id: crypto.randomUUID(),
        type: 'system',
        message,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('actionpilot_activities', JSON.stringify(logs.slice(0, 50)));
      window.dispatchEvent(new Event('activities_updated'));
    } catch (e) {}
  };

  // Load standard tasks & custom birthdays from LocalStorage
  useEffect(() => {
    const loadData = () => {
      const savedTasks = localStorage.getItem('actionpilot_tasks');
      if (savedTasks) {
        setTasks(JSON.parse(savedTasks));
      }

      const savedBdays = localStorage.getItem('actionpilot_birthdays');
      if (savedBdays) {
        setBirthdays(JSON.parse(savedBdays));
      } else {
        const defaultBdays: BirthdayReminder[] = [
          {
            id: '1',
            name: 'Alex Rivera',
            date: format(new Date(), 'yyyy-MM') + '-12',
            type: 'birthday',
            notes: 'Enjoys fiction books & specialty espresso beans',
            notify: true
          },
          {
            id: '2',
            name: 'Sarah Smith',
            date: format(new Date(), 'yyyy-MM') + '-25',
            type: 'birthday',
            notes: 'Buy flower bouquet & send card',
            notify: true
          },
          {
            id: '3',
            name: 'Client Presentation Milestone',
            date: format(new Date(), 'yyyy-MM') + '-18',
            type: 'reminder',
            notes: 'Milestone reminder: verify webhook sync and API deliverables',
            notify: true
          }
        ];
        localStorage.setItem('actionpilot_birthdays', JSON.stringify(defaultBdays));
        setBirthdays(defaultBdays);
      }
    };
    
    loadData();
    window.addEventListener('tasks_updated', loadData);
    return () => window.removeEventListener('tasks_updated', loadData);
  }, []);

  // Helper to persist birthdays
  const saveBirthdays = (updated: BirthdayReminder[]) => {
    setBirthdays(updated);
    localStorage.setItem('actionpilot_birthdays', JSON.stringify(updated));
    window.dispatchEvent(new Event('birthdays_updated'));
  };

  // Helper to persist tasks
  const saveTasks = (updated: Task[]) => {
    setTasks(updated);
    localStorage.setItem('actionpilot_tasks', JSON.stringify(updated));
    window.dispatchEvent(new Event('tasks_updated'));
  };

  // Toggle Task Completed
  const toggleTaskStatus = (taskId: string) => {
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        const newStatus: 'Pending' | 'Completed' = t.status === 'Completed' ? 'Pending' : 'Completed';
        toast.success(`Task status updated to ${newStatus}`);
        return { ...t, status: newStatus };
      }
      return t;
    });
    saveTasks(updated);
    logCalendarActivity(`Toggled task completion for task ID: ${taskId}`);
  };

  // Delete Task
  const deleteTask = (taskId: string) => {
    const updated = tasks.filter(t => t.id !== taskId);
    saveTasks(updated);
    toast.success('Task removed from schedule');
    logCalendarActivity(`Deleted task with ID: ${taskId}`);
  };

  // Quick Add Task Form handler
  const handleQuickAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !quickTaskTitle.trim()) {
      toast.error('Please enter a task title');
      return;
    }

    const newTask: Task = {
      id: crypto.randomUUID(),
      userId: 'current-user',
      title: quickTaskTitle.trim(),
      description: `Manually added via calendar inspector for ${format(selectedDate, 'MMM d, yyyy')}`,
      priority: quickTaskPriority,
      category: quickTaskCategory,
      recurring: 'None',
      status: 'Pending',
      dueDate: selectedDate.toISOString(),
      estimatedMinutes: quickTaskMins,
      subtasks: [],
      createdAt: new Date().toISOString(),
      isAiGenerated: false
    };

    const updated = [...tasks, newTask];
    saveTasks(updated);
    
    logCalendarActivity(`Added task "${newTask.title}" directly from Calendar Inspector`);
    
    setQuickTaskTitle('');
    setQuickFormType('none');
    toast.success(`Task "${newTask.title}" scheduled successfully!`);
  };

  // Quick Add Milestone Form handler
  const handleQuickAddMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !quickMilestoneName.trim()) {
      toast.error('Please enter a name or event title');
      return;
    }

    const newItem: BirthdayReminder = {
      id: crypto.randomUUID(),
      name: quickMilestoneName.trim(),
      date: getLocalDateString(selectedDate),
      type: quickMilestoneType,
      notes: quickMilestoneNotes.trim(),
      notify: true
    };

    const updated = [...birthdays, newItem];
    saveBirthdays(updated);

    logCalendarActivity(`Registered calendar milestone for ${newItem.name}`);

    setQuickMilestoneName('');
    setQuickMilestoneNotes('');
    setQuickFormType('none');
    toast.success(`Milestone "${newItem.name}" saved to Calendar!`);
  };

  // Add a new Birthday / Reminder
  const handleAddBirthday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bdayForm.name.trim()) {
      toast.error('Please enter a name or event title');
      return;
    }

    const newItem: BirthdayReminder = {
      id: crypto.randomUUID(),
      ...bFormDateString()
    };

    const updated = [...birthdays, newItem];
    saveBirthdays(updated);
    setIsAddBdayOpen(false);
    toast.success(`Added ${bdayForm.type === 'birthday' ? "Birthday" : bdayForm.type === 'anniversary' ? "Anniversary" : "Reminder"} for "${bdayForm.name}"!`);
    
    logCalendarActivity(`Registered birthday/milestone for ${bdayForm.name}`);

    setBdayForm({
      name: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      type: 'birthday',
      notes: '',
      notify: true
    });
  };

  const bFormDateString = () => {
    return {
      name: bdayForm.name,
      date: bdayForm.date,
      type: bdayForm.type,
      notes: bdayForm.notes,
      notify: bdayForm.notify
    };
  };

  // Delete a Birthday / Reminder
  const handleDeleteBirthday = (id: string) => {
    const item = birthdays.find(b => b.id === id);
    const updated = birthdays.filter(b => b.id !== id);
    saveBirthdays(updated);
    if (item) {
      toast.success(`Removed calendar reminder for "${item.name}"`);
    }
  };

  // Week Grid Dates
  const weekStartDate = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStartDate, i));

  // Month Grid Dates
  const monthStartDate = startOfMonth(currentDate);
  const monthEndDate = endOfMonth(currentDate);
  const monthGridStartDate = startOfWeek(monthStartDate, { weekStartsOn: 1 });
  const monthGridEndDate = endOfWeek(monthEndDate, { weekStartsOn: 1 });
  const monthDays = eachDayOfInterval({ start: monthGridStartDate, end: monthGridEndDate });

  // Map Tasks and Birthdays to Calendar Events
  const getEventsForDate = (date: Date) => {
    const dayEvents: any[] = [];
    const cellDateStr = getLocalDateString(date);

    // 1. Regular Tasks
    if (filterMode === 'all' || filterMode === 'tasks') {
      tasks.forEach(task => {
        if (task.dueDate) {
          const taskDateStr = getTaskDateString(task.dueDate);
          if (taskDateStr === cellDateStr) {
            dayEvents.push({
              id: task.id,
              originId: task.id,
              title: task.title,
              time: task.estimatedMinutes ? `${task.estimatedMinutes}m` : '30m',
              type: 'task',
              status: task.status,
              priority: task.priority,
              notes: task.description,
              colorClass: task.status === 'Completed' 
                ? 'bg-muted/60 border-border text-muted-foreground line-through opacity-70' 
                : task.priority === 'High' 
                  ? 'bg-destructive/10 border-destructive/20 text-destructive-foreground dark:text-red-400 font-bold' 
                  : 'bg-primary/15 border-primary/25 text-primary-foreground dark:text-blue-400 font-bold'
            });
          }
        }
      });
    }

    // 2. Birthdays & Milestones (Support annual recurrence!)
    if (filterMode === 'all' || filterMode === 'milestones') {
      birthdays.forEach(b => {
        try {
          const bdayDate = parseISO(b.date);
          if (bdayDate.getMonth() === date.getMonth() && bdayDate.getDate() === date.getDate()) {
            const age = date.getFullYear() - bdayDate.getFullYear();
            let label = '';
            let color = '';
            let icon = null;

            if (b.type === 'birthday') {
              label = `${b.name}'s Birthday${age > 0 ? ` (${age})` : ''}`;
              color = 'bg-pink-500/10 border-pink-500/20 text-pink-700 dark:text-pink-300 font-semibold';
              icon = <Cake className="w-3.5 h-3.5 text-pink-500 shrink-0" />;
            } else if (b.type === 'anniversary') {
              label = `${b.name}'s Anniversary`;
              color = 'bg-purple-500/10 border-purple-500/20 text-purple-700 dark:text-purple-300 font-semibold';
              icon = <Gift className="w-3.5 h-3.5 text-purple-500 shrink-0" />;
            } else {
              label = b.name;
              color = 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold';
              icon = <Bell className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
            }

            dayEvents.push({
              id: b.id,
              originId: b.id,
              title: label,
              time: 'All Day',
              type: b.type,
              notes: b.notes,
              icon,
              colorClass: color
            });
          }
        } catch (e) {
          console.error("Error parsing birthday date", e);
        }
      });
    }

    // 3. Holidays & Festivals
    if (filterMode === 'all' || filterMode === 'holidays') {
      const year = date.getFullYear();
      const holidays = HOLIDAYS_DATA[year] || [];
      holidays.forEach(h => {
        if (h.date === cellDateStr) {
          dayEvents.push({
            id: `hld-${h.date}-${h.name}`,
            originId: `hld-${h.date}-${h.name}`,
            title: h.name,
            time: 'All Day',
            type: h.category,
            notes: h.description,
            icon: <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0 animate-pulse" />,
            colorClass: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300 font-bold shadow-sm'
          });
        }
      });
    }

    return dayEvents;
  };

  // Export Tasks to ICS
  const exportTasksToICS = () => {
    const saved = localStorage.getItem('actionpilot_tasks');
    if (!saved) {
      toast.error('No tasks found to export');
      return;
    }
    
    try {
      const parsedTasks: Task[] = JSON.parse(saved);
      const pendingTasks = parsedTasks.filter(t => t.status !== 'Completed');
      
      if (pendingTasks.length === 0) {
        toast.error('No pending tasks to export');
        return;
      }
      
      let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//ActionPilot//Tasks//EN\nCALSCALE:GREGORIAN\n";
      
      let exportedCount = 0;
      pendingTasks.forEach(task => {
        if (!task.dueDate) return;
        
        try {
          const dueDate = new Date(task.dueDate);
          if (isNaN(dueDate.getTime())) return;
          
          const startStr = dueDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
          const endDate = new Date(dueDate.getTime() + (task.estimatedMinutes || 60) * 60000);
          const endStr = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
          const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
          
          icsContent += "BEGIN:VEVENT\n";
          icsContent += `UID:${task.id}@actionpilot\n`;
          icsContent += `DTSTAMP:${dtstamp}\n`;
          icsContent += `DTSTART:${startStr}\n`;
          icsContent += `DTEND:${endStr}\n`;
          icsContent += `SUMMARY:${task.title}\n`;
          if (task.description) {
            icsContent += `DESCRIPTION:${task.description.replace(/\n/g, '\\n')}\n`;
          }
          icsContent += "END:VEVENT\n";
          exportedCount++;
        } catch (e) {
          console.error("Error formatting task date", e);
        }
      });
      
      if (exportedCount === 0) {
        toast.error('No tasks with valid due dates to export');
        return;
      }
      
      icsContent += "END:VCALENDAR";
      
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'actionpilot-tasks.ics');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(`Exported ${exportedCount} tasks to ICS`);
    } catch (e) {
      console.error('Failed to export tasks', e);
      toast.error('Failed to export tasks');
    }
  };

  const nextPeriod = () => {
    if (viewMode === 'week') {
      setCurrentDate(addDays(currentDate, 7));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const prevPeriod = () => {
    if (viewMode === 'week') {
      setCurrentDate(addDays(currentDate, -7));
    } else {
      setCurrentDate(addMonths(currentDate, -1));
    }
  };

  // Get upcoming birthdays in chronological order
  const getUpcomingBirthdays = () => {
    return [...birthdays].sort((a, b) => {
      const aDate = parseISO(a.date);
      const bDate = parseISO(b.date);
      return aDate.getMonth() - bDate.getMonth() || aDate.getDate() - bDate.getDate();
    });
  };

  // Get holidays in currently viewed month
  const getMonthlyHolidays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const holidays = HOLIDAYS_DATA[year] || [];
    return holidays.filter(h => {
      try {
        const hDate = parseISO(h.date);
        return hDate.getMonth() === month;
      } catch (e) {
        return false;
      }
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 px-2 sm:px-4 animate-in fade-in duration-500">
      
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/40 pb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CalendarIcon className="w-8 h-8 text-primary animate-pulse" />
            Calendar Station
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            AI-scheduled execution paths, custom birthdays, and automatic annual holidays/festivals for high-momentum tracking.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs font-bold shadow-sm" onClick={exportTasksToICS}>
            <Download className="w-3.5 h-3.5" />
            Export Sync (ICS)
          </Button>

          <Button 
            variant="default" 
            size="sm" 
            className="gap-1.5 text-xs font-bold bg-pink-600 hover:bg-pink-700 text-white shadow-sm"
            onClick={() => setIsAddBdayOpen(true)}
          >
            <Cake className="w-3.5 h-3.5" />
            Add Milestone
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1.5 text-xs font-bold text-primary border-primary/20 hover:bg-primary/5 shadow-sm"
            onClick={() => window.dispatchEvent(new Event('open-task-modal'))}
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            AI Task Studio
          </Button>
        </div>
      </div>

      {/* Dynamic Interactive Filter Bar */}
      <div className="flex flex-wrap gap-1.5 items-center bg-secondary/30 p-1.5 rounded-xl border border-border/40 max-w-fit shadow-sm">
        <Button
          size="xs"
          variant={filterMode === 'all' ? 'default' : 'ghost'}
          onClick={() => setFilterMode('all')}
          className="text-xs font-bold h-7 rounded-md px-3"
        >
          <Filter className="w-3 h-3 mr-1" />
          All Events
        </Button>
        <Button
          size="xs"
          variant={filterMode === 'tasks' ? 'default' : 'ghost'}
          onClick={() => setFilterMode('tasks')}
          className="text-xs font-bold h-7 rounded-md px-3 text-blue-500 hover:text-blue-600 dark:hover:text-blue-400"
        >
          <CheckSquare className="w-3.5 h-3.5 mr-1" />
          My Tasks
        </Button>
        <Button
          size="xs"
          variant={filterMode === 'milestones' ? 'default' : 'ghost'}
          onClick={() => setFilterMode('milestones')}
          className="text-xs font-bold h-7 rounded-md px-3 text-pink-500 hover:text-pink-600 dark:hover:text-pink-400"
        >
          <Cake className="w-3.5 h-3.5 mr-1" />
          Milestones
        </Button>
        <Button
          size="xs"
          variant={filterMode === 'holidays' ? 'default' : 'ghost'}
          onClick={() => setFilterMode('holidays')}
          className="text-xs font-bold h-7 rounded-md px-3 text-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400"
        >
          <Sparkles className="w-3.5 h-3.5 mr-1" />
          Holidays & Festivals
        </Button>
      </div>

      {/* Main Grid: Left is Calendar, Right is Tabbed Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Calendar Box */}
        <Card className="lg:col-span-9 border-border/50 bg-card/60 backdrop-blur-sm shadow-xl overflow-hidden relative">
          
          {/* Header Controls */}
          <CardHeader className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-border/50 pb-4">
            <div className="flex items-center gap-4">
              <CardTitle className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-primary" />
                {format(currentDate, 'MMMM yyyy')}
              </CardTitle>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" onClick={prevPeriod} className="h-8 w-8 hover:bg-muted">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => setCurrentDate(new Date())} className="h-8 text-xs font-bold px-3">
                  Today
                </Button>
                <Button variant="outline" size="icon" onClick={nextPeriod} className="h-8 w-8 hover:bg-muted">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex bg-muted/60 p-1 rounded-lg border border-border/40 shrink-0">
              <Button 
                variant="ghost" 
                size="sm" 
                className={`h-7 text-xs font-bold px-4 transition-all ${viewMode === 'week' ? 'bg-background shadow-sm text-foreground font-black' : 'text-muted-foreground'}`}
                onClick={() => setViewMode('week')}
              >
                Week View
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className={`h-7 text-xs font-bold px-4 transition-all ${viewMode === 'month' ? 'bg-background shadow-sm text-foreground font-black' : 'text-muted-foreground'}`}
                onClick={() => setViewMode('month')}
              >
                Month View
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {viewMode === 'week' ? (
              /* --- WEEK VIEW --- */
              <div className="flex flex-col">
                <div className="grid grid-cols-7 border-b border-border/50 divide-x divide-border/40 text-center bg-muted/20">
                  {weekDays.map((day, i) => {
                    const isToday = isSameDay(day, new Date());
                    return (
                      <div key={i} className={`p-3.5 ${isToday ? 'bg-primary/5' : ''}`}>
                        <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider mb-1">
                          {format(day, 'EEE')}
                        </p>
                        <p className={`text-xl font-black tracking-tight ${isToday ? 'text-primary scale-110' : 'text-foreground'}`}>
                          {format(day, 'd')}
                        </p>
                      </div>
                    );
                  })}
                </div>
                <div className="grid grid-cols-7 min-h-[420px] divide-x divide-border/40 bg-card/20">
                  {weekDays.map((day, dayIndex) => {
                    const dayEvents = getEventsForDate(day);
                    return (
                      <div 
                        key={dayIndex} 
                        className="p-2 space-y-2 min-h-[300px] hover:bg-muted/10 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedDate(day);
                          setIsDayDetailsOpen(true);
                        }}
                      >
                        {dayEvents.length === 0 ? (
                          <div className="h-full flex items-center justify-center opacity-10">
                            <CalendarIcon className="w-6 h-6 stroke-[1]" />
                          </div>
                        ) : (
                          dayEvents.map((event, i) => (
                            <div 
                              key={i} 
                              className={`p-2 rounded-lg text-[10px] border transition-all hover:scale-[1.02] shadow-sm flex flex-col gap-1 ${event.colorClass}`}
                              title={`${event.title}\n${event.notes || ''}`}
                            >
                              <div className="flex items-center gap-1 font-extrabold">
                                {event.icon}
                                <span className="truncate flex-1">{event.title}</span>
                              </div>
                              <div className="flex items-center gap-1 text-[9px] opacity-75 font-semibold">
                                <Clock className="w-2.5 h-2.5" />
                                {event.time}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* --- MONTH VIEW --- */
              <div className="flex flex-col">
                {/* Month Days of Week Header */}
                <div className="grid grid-cols-7 border-b border-border/50 divide-x divide-border/40 text-center bg-muted/20">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayName, i) => (
                    <div key={i} className="py-2.5 text-xs font-black text-muted-foreground uppercase tracking-wider">
                      {dayName}
                    </div>
                  ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 divide-x divide-y divide-border/40 border-b border-border/40 min-h-[500px]">
                  {monthDays.map((day, i) => {
                    const isToday = isSameDay(day, new Date());
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const dayEvents = getEventsForDate(day);

                    return (
                      <div 
                        key={i} 
                        onClick={() => {
                          setSelectedDate(day);
                          setIsDayDetailsOpen(true);
                        }}
                        className={`p-2 min-h-[100px] flex flex-col justify-between transition-colors hover:bg-muted/10 relative cursor-pointer ${
                          !isCurrentMonth ? 'opacity-30 bg-muted/5' : ''
                        } ${isToday ? 'bg-primary/5 border border-primary/20' : ''}`}
                      >
                        {/* Day Number Label */}
                        <div className="flex justify-between items-center mb-1">
                          <span className={`text-xs font-black px-1.5 py-0.5 rounded-full ${
                            isToday ? 'bg-primary text-primary-foreground scale-105' : 'text-muted-foreground'
                          }`}>
                            {format(day, 'd')}
                          </span>
                          {dayEvents.length > 0 && (
                            <span className="w-2 h-2 rounded-full bg-primary" />
                          )}
                        </div>

                        {/* Day Events stack */}
                        <div className="space-y-1 flex-1 overflow-y-auto max-h-[75px] scrollbar-none">
                          {dayEvents.slice(0, 3).map((event, idx) => (
                            <div 
                              key={idx} 
                              className={`px-1.5 py-0.5 rounded text-[9px] border truncate flex items-center gap-1 font-bold leading-tight cursor-pointer hover:opacity-95 ${event.colorClass}`}
                              title={`${event.title} (${event.time})`}
                            >
                              {event.icon}
                              <span className="truncate flex-1">{event.title}</span>
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-[8px] text-muted-foreground font-black text-center py-0.5 bg-secondary/50 rounded-md border border-border/30">
                              +{dayEvents.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar: Birthdays & Reminders + Monthly Holidays */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="border-border/50 bg-card shadow-xl overflow-hidden">
            {/* Sidebar Tabs */}
            <div className="flex border-b border-border/40 bg-muted/20 p-1 shrink-0">
              <button
                onClick={() => setSidebarTab('milestones')}
                className={`flex-1 text-xs font-extrabold py-2 px-2.5 rounded-lg transition-colors flex items-center justify-center gap-1 ${
                  sidebarTab === 'milestones' 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Cake className="w-3.5 h-3.5 text-pink-500" />
                Milestones
              </button>
              <button
                onClick={() => setSidebarTab('holidays')}
                className={`flex-1 text-xs font-extrabold py-2 px-2.5 rounded-lg transition-colors flex items-center justify-center gap-1 ${
                  sidebarTab === 'holidays' 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                Holidays ({getMonthlyHolidays().length})
              </button>
            </div>

            <CardContent className="p-4 space-y-4">
              {sidebarTab === 'milestones' ? (
                /* Birthdays & Custom reminders list */
                birthdays.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs font-bold">No custom reminders saved.</p>
                    <Button variant="link" size="sm" className="mt-1 text-pink-500 font-extrabold" onClick={() => setIsAddBdayOpen(true)}>
                      Add your first reminder!
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                    {getUpcomingBirthdays().map((item) => {
                      const bDate = parseISO(item.date);
                      const formattedDate = format(bDate, 'MMM d');
                      
                      return (
                        <div 
                          key={item.id} 
                          className="p-2.5 rounded-xl border border-border/40 bg-muted/10 flex items-center justify-between gap-3 group hover:bg-muted/20 hover:border-pink-500/25 transition-all"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                              item.type === 'birthday' ? 'bg-pink-500/10 text-pink-500' :
                              item.type === 'anniversary' ? 'bg-purple-500/10 text-purple-500' :
                              'bg-amber-500/10 text-amber-500'
                            }`}>
                              {item.type === 'birthday' ? <Cake className="w-4 h-4" /> :
                               item.type === 'anniversary' ? <Gift className="w-4 h-4" /> :
                               <Bell className="w-4 h-4" />}
                            </div>
                            <div className="min-w-0">
                              <p className="font-extrabold text-xs text-foreground truncate leading-tight">{item.name}</p>
                              <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                <CalendarIcon className="w-3 h-3 text-pink-400" />
                                {formattedDate} • <span className="capitalize">{item.type}</span>
                              </p>
                              {item.notes && (
                                <p className="text-[9px] text-muted-foreground/90 line-clamp-1 italic mt-1 bg-background/50 px-1 py-0.5 rounded border border-border/10">
                                  {item.notes}
                                </p>
                              )}
                            </div>
                          </div>

                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDeleteBirthday(item.id)} 
                            className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete Reminder"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                /* Holidays & Festivals in this current active month */
                getMonthlyHolidays().length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Globe className="w-8 h-8 mx-auto mb-2 opacity-50 text-emerald-500" />
                    <p className="text-xs font-bold">No holidays this month.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                    {getMonthlyHolidays().map((hld) => {
                      const hldDate = parseISO(hld.date);
                      return (
                        <div 
                          key={hld.name} 
                          className="p-2.5 rounded-xl border border-emerald-500/10 bg-emerald-500/5 flex items-start gap-2.5 hover:bg-emerald-500/10 transition-colors"
                        >
                          <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-extrabold text-xs text-foreground leading-tight">{hld.name}</p>
                            <p className="text-[10px] text-emerald-600 font-bold mt-0.5">
                              {format(hldDate, 'MMM d')} • {hld.category === 'holiday' ? 'National Holiday' : 'Cultural Festival'}
                            </p>
                            {hld.description && (
                              <p className="text-[9px] text-muted-foreground mt-1 leading-normal">
                                {hld.description}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </CardContent>
          </Card>

          {/* Quick Info Box */}
          <Card className="border-border/40 bg-muted/10">
            <CardContent className="p-4 flex gap-3 text-xs text-muted-foreground">
              <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-foreground">Interactive Day Inspector</p>
                <p className="leading-relaxed text-[11px]">
                  Click on any day cell to open the inspector! Add custom tasks, schedule milestones, and check off completed execution tasks directly from the calendar.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Day Details & Event Manager Modal */}
      <AnimatePresence>
        {isDayDetailsOpen && selectedDate && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-card border border-border rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-border/40 bg-muted/20 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-primary" />
                  <div>
                    <h3 className="font-black text-lg text-foreground tracking-tight">
                      {format(selectedDate, 'eeee, MMMM d, yyyy')}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Day Inspector & Event Planner
                    </p>
                  </div>
                </div>
                <button 
                  type="button" 
                  className="text-muted-foreground hover:text-foreground text-lg font-bold p-1 rounded-md hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    setIsDayDetailsOpen(false);
                    setQuickFormType('none');
                  }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body: Split into List and Quick Add Form */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                
                {/* 1. Events list */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4 text-primary" />
                    Scheduled on this date ({getEventsForDate(selectedDate).length})
                  </h4>

                  {getEventsForDate(selectedDate).length === 0 ? (
                    <div className="text-center py-8 rounded-xl border border-dashed border-border/60 bg-muted/5 text-muted-foreground">
                      <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30 text-primary animate-pulse" />
                      <p className="text-xs font-bold">No tasks, milestones, or holidays scheduled today.</p>
                      <p className="text-[10px] text-muted-foreground/80 mt-1">Use the quick add tool below to plan your day!</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {getEventsForDate(selectedDate).map((event) => {
                        const isTask = event.type === 'task';
                        return (
                          <div 
                            key={event.id}
                            className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 transition-colors ${event.colorClass}`}
                          >
                            <div className="flex gap-3 items-start min-w-0">
                              {isTask ? (
                                <button
                                  onClick={() => toggleTaskStatus(event.originId)}
                                  className="mt-0.5 text-muted-foreground hover:text-primary transition-colors shrink-0"
                                >
                                  {event.status === 'Completed' ? (
                                    <CheckSquare className="w-4.5 h-4.5 text-emerald-500 fill-emerald-500/10" />
                                  ) : (
                                    <Square className="w-4.5 h-4.5" />
                                  )}
                                </button>
                              ) : (
                                <div className="mt-0.5 shrink-0">
                                  {event.icon}
                                </div>
                              )}

                              <div className="min-w-0 space-y-0.5">
                                <p className={`font-extrabold text-sm text-foreground leading-tight ${event.status === 'Completed' ? 'line-through opacity-70' : ''}`}>
                                  {event.title}
                                </p>
                                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-muted-foreground">
                                  <span className="flex items-center gap-1 font-semibold">
                                    <Clock className="w-3 h-3 text-muted-foreground/70" />
                                    {event.time}
                                  </span>
                                  {event.priority && (
                                    <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded border ${
                                      event.priority === 'High' ? 'bg-destructive/15 text-destructive border-destructive/20' :
                                      event.priority === 'Medium' ? 'bg-amber-500/15 text-amber-600 border-amber-500/20' :
                                      'bg-emerald-500/15 text-emerald-600 border-emerald-500/20'
                                    }`}>
                                      {event.priority} Urgency
                                    </span>
                                  )}
                                  <span className="capitalize font-extrabold text-muted-foreground/80">• {event.type}</span>
                                </div>
                                {event.notes && (
                                  <p className="text-[11px] text-muted-foreground/90 italic leading-normal border-t border-current/10 pt-1.5 mt-1.5">
                                    {event.notes}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            {event.type !== 'holiday' && event.type !== 'festival' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md shrink-0 self-center"
                                onClick={() => {
                                  if (isTask) {
                                    deleteTask(event.originId);
                                  } else {
                                    handleDeleteBirthday(event.originId);
                                  }
                                }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. Interactive quick add selectors */}
                <div className="border-t border-border/40 pt-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-muted-foreground uppercase tracking-wider">
                      Quick Add & Day Planning
                    </h4>
                    
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant={quickFormType === 'task' ? 'default' : 'outline'}
                        className="text-[11px] h-7 font-bold"
                        onClick={() => setQuickFormType(quickFormType === 'task' ? 'none' : 'task')}
                      >
                        <CheckSquare className="w-3 h-3 mr-1" />
                        + Task
                      </Button>
                      <Button
                        size="sm"
                        variant={quickFormType === 'milestone' ? 'default' : 'outline'}
                        className="text-[11px] h-7 font-bold"
                        onClick={() => setQuickFormType(quickFormType === 'milestone' ? 'none' : 'milestone')}
                      >
                        <Cake className="w-3.5 h-3.5 mr-1" />
                        + Milestone
                      </Button>
                    </div>
                  </div>

                  {/* AI Quick Planner Trigger */}
                  <div className="p-3 bg-primary/5 rounded-xl border border-primary/10 flex items-center justify-between gap-4 text-xs">
                    <div className="space-y-0.5">
                      <p className="font-extrabold text-foreground flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
                        AI Auto-Scheduler Studio
                      </p>
                      <p className="text-muted-foreground text-[10px] leading-normal">
                        Converse with AI to build and map a detailed step-by-step execution timeline for {format(selectedDate, 'MMMM d')}.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        localStorage.setItem('actionpilot_prefilled_task_date', selectedDate.toISOString());
                        setIsDayDetailsOpen(false);
                        window.dispatchEvent(new Event('open-task-modal'));
                        toast.success(`AI Studio prefilled for ${format(selectedDate, 'MMM d')}!`);
                      }}
                      className="font-bold text-xs bg-primary hover:bg-primary/90 whitespace-nowrap"
                    >
                      Plan with AI
                    </Button>
                  </div>

                  {/* Quick Form: Add Task */}
                  <AnimatePresence>
                    {quickFormType === 'task' && (
                      <motion.form
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        onSubmit={handleQuickAddTask}
                        className="p-4 rounded-xl border border-border bg-muted/10 space-y-3.5 overflow-hidden"
                      >
                        <div className="flex justify-between items-center border-b border-border/10 pb-2">
                          <p className="text-xs font-bold text-foreground">Add Custom Task</p>
                          <button type="button" onClick={() => setQuickFormType('none')} className="text-xs text-muted-foreground hover:text-foreground font-semibold">✕ Cancel</button>
                        </div>
                        
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Task Title</label>
                          <input
                            type="text"
                            placeholder="e.g. Code database schema migrations"
                            value={quickTaskTitle}
                            onChange={(e) => setQuickTaskTitle(e.target.value)}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Priority</label>
                            <select
                              value={quickTaskPriority}
                              onChange={(e) => setQuickTaskPriority(e.target.value as any)}
                              className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                              <option value="High" className="text-foreground">🔴 High</option>
                              <option value="Medium" className="text-foreground">🟠 Medium</option>
                              <option value="Low" className="text-foreground">🟢 Low</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Category</label>
                            <select
                              value={quickTaskCategory}
                              onChange={(e) => setQuickTaskCategory(e.target.value)}
                              className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                              <option value="General" className="text-foreground">💼 General</option>
                              <option value="Work" className="text-foreground">💻 Work</option>
                              <option value="Personal" className="text-foreground">🏠 Personal</option>
                              <option value="Health" className="text-foreground">❤️ Health</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Duration (m)</label>
                            <input
                              type="number"
                              value={quickTaskMins}
                              onChange={(e) => setQuickTaskMins(parseInt(e.target.value) || 15)}
                              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                              min="5"
                              required
                            />
                          </div>
                        </div>

                        <Button type="submit" size="sm" className="w-full text-xs font-bold bg-primary hover:bg-primary/90">
                          Add Task to Calendar
                        </Button>
                      </motion.form>
                    )}
                  </AnimatePresence>

                  {/* Quick Form: Add Milestone */}
                  <AnimatePresence>
                    {quickFormType === 'milestone' && (
                      <motion.form
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        onSubmit={handleQuickAddMilestone}
                        className="p-4 rounded-xl border border-border bg-muted/10 space-y-3.5 overflow-hidden"
                      >
                        <div className="flex justify-between items-center border-b border-border/10 pb-2">
                          <p className="text-xs font-bold text-foreground">Add Birthday or Anniversary</p>
                          <button type="button" onClick={() => setQuickFormType('none')} className="text-xs text-muted-foreground hover:text-foreground font-semibold">✕ Cancel</button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Milestone Name</label>
                            <input
                              type="text"
                              placeholder="e.g. Grandma's birthday"
                              value={quickMilestoneName}
                              onChange={(e) => setQuickMilestoneName(e.target.value)}
                              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                              required
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Type</label>
                            <select
                              value={quickMilestoneType}
                              onChange={(e) => setQuickMilestoneType(e.target.value as any)}
                              className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                              <option value="birthday" className="text-foreground">🎂 Birthday</option>
                              <option value="anniversary" className="text-foreground">💖 Anniversary</option>
                              <option value="reminder" className="text-foreground">🔔 Reminder</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Gift Ideas & Notes</label>
                          <input
                            type="text"
                            placeholder="e.g. Likes gardening. Send flowers."
                            value={quickMilestoneNotes}
                            onChange={(e) => setQuickMilestoneNotes(e.target.value)}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                          />
                        </div>

                        <Button type="submit" size="sm" className="w-full text-xs font-bold bg-pink-600 hover:bg-pink-700 text-white border-0 shadow-sm">
                          Save Milestone
                        </Button>
                      </motion.form>
                    )}
                  </AnimatePresence>

                </div>

              </div>

              {/* Footer */}
              <div className="px-6 py-3 border-t border-border/40 bg-muted/20 flex justify-end shrink-0">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    setIsDayDetailsOpen(false);
                    setQuickFormType('none');
                  }}
                  className="font-bold text-xs"
                >
                  Close Inspector
                </Button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main dialog for adding Birthdays / Milestones */}
      <AnimatePresence>
        {isAddBdayOpen && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-border/40 bg-muted/20 flex justify-between items-center">
                <h3 className="font-extrabold text-lg text-foreground flex items-center gap-2">
                  <Cake className="w-5 h-5 text-pink-500" />
                  Add Calendar Milestone
                </h3>
                <button 
                  type="button" 
                  className="text-muted-foreground hover:text-foreground text-sm font-semibold"
                  onClick={() => setIsAddBdayOpen(false)}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddBirthday} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Milestone / Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Grandma's Birthday, Team Anniversary"
                    value={bFormNameString()}
                    onChange={(e) => setBdayForm(prev => ({ ...prev, name: e.target.value }))}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Date</label>
                    <input 
                      type="date"
                      value={bdayForm.date}
                      onChange={(e) => setBdayForm(prev => ({ ...prev, date: e.target.value }))}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Category</label>
                    <select
                      value={bdayForm.type}
                      onChange={(e) => setBdayForm(prev => ({ ...prev, type: e.target.value as any }))}
                      className="flex h-9 w-full rounded-md border border-input bg-card px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                    >
                      <option value="birthday" className="text-foreground">🎂 Birthday</option>
                      <option value="anniversary" className="text-foreground">💖 Anniversary</option>
                      <option value="reminder" className="text-foreground">🔔 General Reminder</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Gift Ideas & Notes</label>
                  <textarea 
                    placeholder="e.g. Loves gardening books. Send flower bouquet or buy gift card."
                    value={bFormNotesString()}
                    onChange={(e) => setBdayForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input 
                    type="checkbox"
                    id="notify_chk"
                    checked={bFormNotifyString()}
                    onChange={(e) => setBdayForm(prev => ({ ...prev, notify: e.target.checked }))}
                    className="rounded border-gray-300 dark:border-border/50 text-primary focus:ring-primary w-4 h-4 transition-colors"
                  />
                  <label htmlFor="notify_chk" className="text-xs font-bold text-muted-foreground cursor-pointer select-none">
                    Notify me in Daily Digest
                  </label>
                </div>

                <div className="flex gap-2 justify-end pt-4 border-t border-border/40">
                  <Button variant="outline" type="button" size="sm" onClick={() => setIsAddBdayOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="bg-pink-600 hover:bg-pink-700 text-white">
                    Save to Calendar
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );

  function bFormNameString(): string {
    return bdayForm.name;
  }
  function bFormNotesString(): string {
    return bdayForm.notes || '';
  }
  function bFormNotifyString(): boolean {
    return bdayForm.notify || false;
  }
}
