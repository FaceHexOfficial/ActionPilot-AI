import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Task, Subtask } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  CheckSquare,
  Clock,
  Plus,
  Target,
  Trash2,
  Search,
  Repeat,
  ChevronDown,
  ChevronUp,
  CalendarDays,
  Volume2,
  VolumeX,
  Share2,
  Pencil,
  Briefcase,
  User as UserIcon,
  BookOpen,
  ShoppingCart,
  Heart,
  MapPin,
  Grid,
  Sparkles,
  RefreshCw,
  PlusCircle,
  Archive,
  Undo,
  HelpCircle,
  PlusSquare,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { logActivity } from '../lib/activity';
import { toast } from 'react-hot-toast';
import { getTaskDateString } from '../lib/utils';

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deletedTasks, setDeletedTasks] = useState<any[]>([]);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<'High' | 'Medium' | 'Low' | null>(null);
  const [sortOption, setSortOption] = useState<'priority-desc' | 'priority-asc' | 'date-closest' | 'alpha' | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTasks, setExpandedTasks] = useState<string[]>([]);
  const [isPlayingTasks, setIsPlayingTasks] = useState(false);

  // Edit Task Dialog State
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPriority, setEditPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [editCategory, setEditCategory] = useState('General');
  const [editRecurring, setEditRecurring] = useState<'None' | 'Daily' | 'Weekly' | 'Monthly'>('None');
  const [editEstimatedMinutes, setEditEstimatedMinutes] = useState(30);
  const [editDueDate, setEditDueDate] = useState('');
  const [editSubtasks, setEditSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskMinutes, setNewSubtaskMinutes] = useState(15);

  // Add Multiple Tasks Dialog State
  const [isMultiAddOpen, setIsMultiAddOpen] = useState(false);
  const [multiAddText, setMultiAddText] = useState('');
  const [multiDefaultCategory, setMultiDefaultCategory] = useState('General');
  const [multiDefaultPriority, setMultiDefaultPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [multiDefaultDate, setMultiDefaultDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [multiDefaultMinutes, setMultiDefaultMinutes] = useState(30);

  // Swap / Replace Task Dialog State
  const [taskToSwap, setTaskToSwap] = useState<Task | null>(null);
  const [swapTargetId, setSwapTargetId] = useState<string>('');

  useEffect(() => {
    // Cleanup speech synthesis on unmount
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const loadTasksAndArchive = () => {
    const saved = localStorage.getItem('actionpilot_tasks');
    if (saved) {
      try {
        setTasks(JSON.parse(saved));
      } catch(e) {}
    } else {
      const defaultTasks: Task[] = [
        {
          id: '1',
          userId: 'user1',
          title: 'Cyber Security Assignment',
          description: 'Complete the final chapter analysis and submit.',
          priority: 'High',
          category: 'Study',
          status: 'Pending',
          dueDate: new Date().toISOString(),
          estimatedMinutes: 120,
          subtasks: [
            { id: '1-1', title: 'Read chapter 4', completed: false, estimatedMinutes: 45 },
            { id: '1-2', title: 'Write summary', completed: false, estimatedMinutes: 75 }
          ],
          createdAt: new Date().toISOString(),
          isAiGenerated: true
        }
      ];
      setTasks(defaultTasks);
      localStorage.setItem('actionpilot_tasks', JSON.stringify(defaultTasks));
    }

    const savedDeleted = localStorage.getItem('actionpilot_deleted_tasks');
    if (savedDeleted) {
      try {
        setDeletedTasks(JSON.parse(savedDeleted));
      } catch (e) {}
    } else {
      setDeletedTasks([]);
    }
  };

  useEffect(() => {
    loadTasksAndArchive();
    window.addEventListener('tasks_updated', loadTasksAndArchive);
    return () => window.removeEventListener('tasks_updated', loadTasksAndArchive);
  }, []);

  const playPendingTasks = () => {
    if (isPlayingTasks) {
      window.speechSynthesis.cancel();
      setIsPlayingTasks(false);
      return;
    }

    const pendingTasks = tasks.filter(t => t.status !== 'Completed' && t.status !== 'Skipped');
    let text = '';
    
    if (pendingTasks.length === 0) {
       text = "You have no pending tasks. Great job!";
    } else {
       text = `You have ${pendingTasks.length} pending task${pendingTasks.length > 1 ? 's' : ''}. `;
       pendingTasks.forEach((t, i) => {
         text += `Task ${i + 1}: ${t.title}. `;
       });
    }
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    utterance.onstart = () => setIsPlayingTasks(true);
    utterance.onend = () => setIsPlayingTasks(false);
    utterance.onerror = () => setIsPlayingTasks(false);
    
    window.speechSynthesis.speak(utterance);
  };

  const simulateDeadlineAlert = () => {
    const alertsEnabled = localStorage.getItem('actionpilot_task_voice_alerts') === 'true';
    if (!alertsEnabled) {
      toast('Task voice alerts are disabled in Settings.', { icon: '🔇' });
      return;
    }

    const pendingTasks = tasks.filter(t => t.status !== 'Completed' && t.status !== 'Skipped');
    if (pendingTasks.length === 0) {
      toast('No pending tasks to alert about.');
      return;
    }

    const taskToAlert = pendingTasks[0];
    const text = `Attention: Task "${taskToAlert.title}" has 2 minutes remaining.`;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    toast('Playing simulated deadline alert...');
    window.speechSynthesis.speak(utterance);
  };

  const toggleTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    const willBeCompleted = task?.status !== 'Completed';
    
    if (willBeCompleted) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }

    let updatedTasks = [...tasks];

    if (willBeCompleted && task?.recurring && task.recurring !== 'None') {
      const nextDate = new Date(task.dueDate);
      if (task.recurring === 'Daily') nextDate.setDate(nextDate.getDate() + 1);
      else if (task.recurring === 'Weekly') nextDate.setDate(nextDate.getDate() + 7);
      else if (task.recurring === 'Monthly') nextDate.setMonth(nextDate.getMonth() + 1);
      
      const newTask = {
        ...task,
        id: crypto.randomUUID(),
        status: 'Pending' as const,
        dueDate: nextDate.toISOString(),
        createdAt: new Date().toISOString(),
        subtasks: task.subtasks.map(st => ({ ...st, id: crypto.randomUUID(), completed: false }))
      };
      updatedTasks.push(newTask);
    }

    const finalUpdated = updatedTasks.map(t => 
      t.id === taskId 
        ? { 
            ...t, 
            status: t.status === 'Completed' ? 'Pending' : 'Completed' as any,
            recurring: willBeCompleted ? 'None' : t.recurring
          } 
        : t
    );
    
    setTasks(finalUpdated);
    localStorage.setItem('actionpilot_tasks', JSON.stringify(finalUpdated));
    window.dispatchEvent(new Event('tasks_updated'));
    
    if (willBeCompleted && task) {
      logActivity('task_completed', `Task completed: ${task.title}`);
    }
  };

  const toggleSubtask = (taskId: string, subId: string) => {
    let subtaskWillBeCompleted = false;

    const updated = tasks.map(t => {
      if (t.id === taskId) {
        const subs = t.subtasks.map(s => {
          if (s.id === subId) {
            subtaskWillBeCompleted = !s.completed;
            return { ...s, completed: !s.completed };
          }
          return s;
        });
        return { ...t, subtasks: subs };
      }
      return t;
    });

    if (subtaskWillBeCompleted) {
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.7 }
      });
    }

    setTasks(updated);
    localStorage.setItem('actionpilot_tasks', JSON.stringify(updated));
    window.dispatchEvent(new Event('tasks_updated'));
  };

  const updateTaskRecurring = (taskId: string, recurring: 'None' | 'Daily' | 'Weekly' | 'Monthly') => {
    const updated = tasks.map(t => 
      t.id === taskId ? { ...t, recurring } : t
    );
    setTasks(updated);
    localStorage.setItem('actionpilot_tasks', JSON.stringify(updated));
    window.dispatchEvent(new Event('tasks_updated'));
  };

  const updateTaskPriority = (taskId: string, priority: 'High' | 'Medium' | 'Low') => {
    const updated = tasks.map(t => 
      t.id === taskId ? { ...t, priority } : t
    );
    setTasks(updated);
    localStorage.setItem('actionpilot_tasks', JSON.stringify(updated));
    window.dispatchEvent(new Event('tasks_updated'));
  };

  const removeTask = (taskId: string) => {
    const taskObj = tasks.find(t => t.id === taskId);
    if (taskObj) {
      const deleted = localStorage.getItem('actionpilot_deleted_tasks') || '[]';
      try {
        const deletedArr = JSON.parse(deleted);
        deletedArr.unshift({ ...taskObj, status: 'Skipped', deletedAt: new Date().toISOString() });
        localStorage.setItem('actionpilot_deleted_tasks', JSON.stringify(deletedArr.slice(0, 50)));
      } catch (e) {}
    }

    const updated = tasks.filter(t => t.id !== taskId);
    setTasks(updated);
    localStorage.setItem('actionpilot_tasks', JSON.stringify(updated));
    setSelectedTasks(selectedTasks.filter(id => id !== taskId));
    toast.success('Task removed and archived.');
    window.dispatchEvent(new Event('tasks_updated'));
  };

  const removeSelectedTasks = () => {
    const selectedTaskObjs = tasks.filter(t => selectedTasks.includes(t.id));
    const deleted = localStorage.getItem('actionpilot_deleted_tasks') || '[]';
    try {
      const deletedArr = JSON.parse(deleted);
      selectedTaskObjs.forEach(taskObj => {
        deletedArr.unshift({ ...taskObj, status: 'Skipped', deletedAt: new Date().toISOString() });
      });
      localStorage.setItem('actionpilot_deleted_tasks', JSON.stringify(deletedArr.slice(0, 50)));
    } catch (e) {}

    const updated = tasks.filter(t => !selectedTasks.includes(t.id));
    setTasks(updated);
    localStorage.setItem('actionpilot_tasks', JSON.stringify(updated));
    setSelectedTasks([]);
    setIsBulkDeleteOpen(false);
    toast.success(`${selectedTaskObjs.length} tasks archived.`);
    window.dispatchEvent(new Event('tasks_updated'));
  };

  const updateSelectedTasksPriority = (priority: 'High' | 'Medium' | 'Low') => {
    const updated = tasks.map(t => 
      selectedTasks.includes(t.id) ? { ...t, priority } : t
    );
    setTasks(updated);
    localStorage.setItem('actionpilot_tasks', JSON.stringify(updated));
    setSelectedTasks([]);
    window.dispatchEvent(new Event('tasks_updated'));
  };

  const toggleExpandedTask = (taskId: string) => {
    setExpandedTasks(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  // RESTORE AN ARCHIVED TASK
  const restoreArchivedTask = (archivedTask: any) => {
    const newTask: Task = {
      id: archivedTask.id || crypto.randomUUID(),
      userId: archivedTask.userId || 'user1',
      title: archivedTask.title,
      description: archivedTask.description,
      priority: archivedTask.priority || 'Medium',
      category: archivedTask.category || 'General',
      status: 'Pending',
      dueDate: archivedTask.dueDate || new Date().toISOString(),
      estimatedMinutes: archivedTask.estimatedMinutes || 30,
      subtasks: archivedTask.subtasks || [],
      createdAt: archivedTask.createdAt || new Date().toISOString(),
      isAiGenerated: archivedTask.isAiGenerated || false,
      recurring: archivedTask.recurring || 'None'
    };

    const updatedActive = [...tasks, newTask];
    setTasks(updatedActive);
    localStorage.setItem('actionpilot_tasks', JSON.stringify(updatedActive));

    const updatedDeleted = deletedTasks.filter(t => t.id !== archivedTask.id);
    setDeletedTasks(updatedDeleted);
    localStorage.setItem('actionpilot_deleted_tasks', JSON.stringify(updatedDeleted));

    toast.success(`Restored: ${newTask.title}`);
    window.dispatchEvent(new Event('tasks_updated'));
  };

  // SWAP / REPLACE DIALOG TRIGGERS
  const openSwapDialog = (task: Task) => {
    setTaskToSwap(task);
    const availableTargets = tasks.filter(t => t.id !== task.id);
    if (availableTargets.length > 0) {
      setSwapTargetId(availableTargets[0].id);
    } else {
      setSwapTargetId('');
    }
  };

  const executeSwapTasks = () => {
    if (!taskToSwap || !swapTargetId) return;

    const sourceTask = tasks.find(t => t.id === taskToSwap.id);
    const targetTask = tasks.find(t => t.id === swapTargetId);

    if (!sourceTask || !targetTask) return;

    // Swap title, description, priority, category, subtasks, estimatedMinutes, dueDate
    const updated = tasks.map(t => {
      if (t.id === sourceTask.id) {
        return {
          ...t,
          title: targetTask.title,
          description: targetTask.description,
          priority: targetTask.priority,
          category: targetTask.category,
          subtasks: targetTask.subtasks,
          estimatedMinutes: targetTask.estimatedMinutes,
          dueDate: targetTask.dueDate,
          recurring: targetTask.recurring,
          isAiGenerated: targetTask.isAiGenerated
        };
      }
      if (t.id === targetTask.id) {
        return {
          ...t,
          title: sourceTask.title,
          description: sourceTask.description,
          priority: sourceTask.priority,
          category: sourceTask.category,
          subtasks: sourceTask.subtasks,
          estimatedMinutes: sourceTask.estimatedMinutes,
          dueDate: sourceTask.dueDate,
          recurring: sourceTask.recurring,
          isAiGenerated: sourceTask.isAiGenerated
        };
      }
      return t;
    });

    setTasks(updated);
    localStorage.setItem('actionpilot_tasks', JSON.stringify(updated));
    setTaskToSwap(null);
    toast.success(`Swapped positions: "${sourceTask.title}" ⇄ "${targetTask.title}"`);
    window.dispatchEvent(new Event('tasks_updated'));
  };

  // EDIT MODAL ACTIONS
  const startEditing = (task: Task) => {
    setTaskToEdit(task);
    setEditTitle(task.title);
    setEditDesc(task.description || '');
    setEditPriority(task.priority);
    setEditCategory(task.category || 'General');
    setEditRecurring(task.recurring || 'None');
    setEditEstimatedMinutes(task.estimatedMinutes || 30);
    setEditDueDate(task.dueDate ? task.dueDate.split('T')[0] : new Date().toISOString().split('T')[0]);
    setEditSubtasks(task.subtasks || []);
    setNewSubtaskTitle('');
    setNewSubtaskMinutes(15);
  };

  const addEditSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    const newSub: Subtask = {
      id: crypto.randomUUID(),
      title: newSubtaskTitle,
      completed: false,
      estimatedMinutes: newSubtaskMinutes
    };
    setEditSubtasks([...editSubtasks, newSub]);
    setNewSubtaskTitle('');
  };

  const removeEditSubtask = (id: string) => {
    setEditSubtasks(editSubtasks.filter(st => st.id !== id));
  };

  const saveEditedTask = () => {
    if (!taskToEdit) return;
    if (!editTitle.trim()) {
      toast.error('Task title is required.');
      return;
    }

    const updated = tasks.map(t => {
      if (t.id === taskToEdit.id) {
        return {
          ...t,
          title: editTitle,
          description: editDesc,
          priority: editPriority,
          category: editCategory,
          recurring: editRecurring,
          estimatedMinutes: editEstimatedMinutes,
          dueDate: editDueDate ? new Date(editDueDate).toISOString() : new Date().toISOString(),
          subtasks: editSubtasks
        };
      }
      return t;
    });

    setTasks(updated);
    localStorage.setItem('actionpilot_tasks', JSON.stringify(updated));
    setTaskToEdit(null);
    toast.success('Task details updated successfully.');
    window.dispatchEvent(new Event('tasks_updated'));
  };

  // BULK MULTI-TASK CREATION
  const handleBulkCreateTasks = () => {
    if (!multiAddText.trim()) {
      toast.error('Please enter at least one task title.');
      return;
    }

    const lines = multiAddText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      toast.error('Please enter at least one task title.');
      return;
    }

    const newTasksList: Task[] = lines.map(line => {
      return {
        id: crypto.randomUUID(),
        userId: 'user1',
        title: line,
        description: `Batch created task`,
        priority: multiDefaultPriority,
        category: multiDefaultCategory,
        status: 'Pending',
        dueDate: new Date(multiDefaultDate).toISOString(),
        estimatedMinutes: multiDefaultMinutes,
        subtasks: [],
        createdAt: new Date().toISOString(),
        isAiGenerated: false,
        recurring: 'None'
      };
    });

    const updated = [...tasks, ...newTasksList];
    setTasks(updated);
    localStorage.setItem('actionpilot_tasks', JSON.stringify(updated));
    
    setIsMultiAddOpen(false);
    setMultiAddText('');
    toast.success(`Successfully added ${newTasksList.length} tasks!`);
    window.dispatchEvent(new Event('tasks_updated'));
  };

  const categories = Array.from(new Set(tasks.map(t => t.category).filter(Boolean))) as string[];

  const filteredTasks = tasks.filter(t => {
    const matchesCategory = selectedCategory ? t.category === selectedCategory : true;
    const matchesPriority = selectedPriorityFilter ? t.priority === selectedPriorityFilter : true;
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesPriority && matchesSearch;
  });

  const getPriorityWeight = (priority: string) => {
    switch (priority) {
      case 'High': return 3;
      case 'Medium': return 2;
      case 'Low': return 1;
      default: return 0;
    }
  };

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortOption === 'priority-desc') {
      return getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
    } else if (sortOption === 'priority-asc') {
      return getPriorityWeight(a.priority) - getPriorityWeight(b.priority);
    } else if (sortOption === 'date-closest') {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    } else if (sortOption === 'alpha') {
      return a.title.localeCompare(b.title);
    }
    return 0;
  });

  const shareTask = async (task: Task) => {
    let text = `Task: ${task.title}\nPriority: ${task.priority}\nStatus: ${task.status}`;
    if (task.description) {
      text += `\n\nNotes:\n${task.description}`;
    }
    if (task.subtasks && task.subtasks.length > 0) {
      text += `\n\nSteps:\n${task.subtasks.map(st => `- [${st.completed ? 'x' : ' '}] ${st.title} (${st.estimatedMinutes}m)`).join('\n')}`;
    }

    try {
      if (navigator.share) {
        await navigator.share({
          title: `Task: ${task.title}`,
          text: text,
        });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success('Task details copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // Helper for rendering category icons dynamically
  const getCategoryIcon = (category?: string) => {
    if (!category) return <Grid className="w-4 h-4" />;
    switch (category.toLowerCase()) {
      case 'work': return <Briefcase className="w-4 h-4 text-sky-400" />;
      case 'personal': return <UserIcon className="w-4 h-4 text-indigo-400" />;
      case 'study': return <BookOpen className="w-4 h-4 text-emerald-400" />;
      case 'shopping': return <ShoppingCart className="w-4 h-4 text-pink-400" />;
      case 'health': return <Heart className="w-4 h-4 text-red-400" />;
      case 'errands': return <MapPin className="w-4 h-4 text-amber-400" />;
      default: return <Grid className="w-4 h-4 text-purple-400" />;
    }
  };

  const renderTaskCard = (task: Task) => {
    const totalSubtasks = task.subtasks?.length || 0;
    const completedSubtasks = task.subtasks?.filter(st => st.completed).length || 0;
    const subtaskPercent = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

    const borderColors = {
      High: 'border-l-4 border-l-rose-500',
      Medium: 'border-l-4 border-l-amber-500',
      Low: 'border-l-4 border-l-emerald-500'
    };

    return (
      <motion.div
        key={task.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.23 }}
      >
        <Card className={`border-border/50 overflow-hidden relative transition-all hover:translate-x-0.5 hover:shadow-md ${borderColors[task.priority] || 'border-l-4 border-l-slate-500'} ${task.status === 'Completed' ? 'opacity-65 bg-muted/40' : 'bg-card'}`}>
          <div className="p-5 flex flex-col sm:flex-row gap-4 items-start">
            
            {/* Left Checkboxes */}
            <div className="flex sm:flex-col items-center gap-3.5 pt-1.5 shrink-0">
              <Checkbox
                checked={selectedTasks.includes(task.id)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedTasks([...selectedTasks, task.id]);
                  } else {
                    setSelectedTasks(selectedTasks.filter(id => id !== task.id));
                  }
                }}
                className="w-5 h-5 rounded border-muted-foreground/40 data-[state=checked]:border-primary"
                title="Select Task"
              />
              <Checkbox 
                checked={task.status === 'Completed'} 
                onCheckedChange={() => toggleTask(task.id)} 
                className="w-5 h-5 rounded-md border-muted-foreground/50 h-5 w-5 [&_svg]:h-3.5 [&_svg]:w-3.5"
                title="Mark Done"
              />
            </div>

            {/* Content area */}
            <div className="flex-1 space-y-2 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <h3 className={`font-semibold text-lg tracking-tight ${task.status === 'Completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {task.title}
                  </h3>
                  {task.dueDate && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <CalendarDays className="w-3.5 h-3.5 text-muted-foreground/80" />
                      Scheduled: {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                </div>

                {/* Operations */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                  <Select
                    value={task.priority}
                    onValueChange={(val: any) => updateTaskPriority(task.id, val)}
                  >
                    <SelectTrigger className={`h-6 text-xs font-semibold rounded-full border px-2.5 shadow-none focus:ring-0 w-24 ${
                      task.priority === 'High' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                      task.priority === 'Medium' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                      'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                    }`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High" className="text-rose-500 font-medium">High</SelectItem>
                      <SelectItem value="Medium" className="text-amber-500 font-medium">Medium</SelectItem>
                      <SelectItem value="Low" className="text-emerald-500 font-medium">Low</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => startEditing(task)} 
                    className="h-7 w-7 text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/5"
                    title="Edit Task Details"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>

                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => openSwapDialog(task)} 
                    className="h-7 w-7 text-muted-foreground hover:text-sky-400 hover:bg-sky-500/5"
                    title="Swap / Replace Slot"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>

                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => shareTask(task)} 
                    className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/5"
                    title="Share Task"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </Button>

                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setTaskToDelete(task.id)} 
                    className="h-7 w-7 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/5"
                    title="Delete & Archive Task"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {task.description && (
                <div className="mt-1">
                  <button 
                    onClick={() => toggleExpandedTask(task.id)}
                    className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors py-0.5"
                  >
                    {expandedTasks.includes(task.id) ? (
                      <><ChevronUp className="w-3 h-3" /> Hide description</>
                    ) : (
                      <><ChevronDown className="w-3 h-3" /> Show description</>
                    )}
                  </button>
                  <AnimatePresence>
                    {expandedTasks.includes(task.id) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden mt-1"
                      >
                        <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap bg-muted/30 p-3 rounded border border-border/40">
                          {task.description}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Progress gauge for subtasks */}
              {totalSubtasks > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span className="font-semibold">Subtasks Checklist</span>
                    <span>{completedSubtasks} of {totalSubtasks} steps completed ({subtaskPercent}%)</span>
                  </div>
                  <Progress value={subtaskPercent} className="h-1.5 bg-muted rounded-full overflow-hidden" />
                </div>
              )}
              
              {/* Task badges */}
              <div className="flex flex-wrap gap-2.5 pt-2 text-xs font-medium text-muted-foreground">
                <div className="flex items-center gap-1 px-2.5 py-0.5 bg-secondary text-secondary-foreground rounded border border-border/50">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  {task.estimatedMinutes} mins
                </div>
                {task.category && (
                  <div className="flex items-center gap-1 px-2.5 py-0.5 bg-secondary text-secondary-foreground rounded border border-border/50">
                    {getCategoryIcon(task.category)}
                    {task.category}
                  </div>
                )}
                {task.recurring && task.recurring !== 'None' && (
                  <div className="flex items-center gap-1 px-2.5 py-0.5 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 rounded border border-indigo-500/20">
                    <Repeat className="w-3 h-3" />
                    {task.recurring}
                  </div>
                )}
                {task.isAiGenerated && (
                  <div className="flex items-center gap-1 px-2.5 py-0.5 bg-primary/10 text-primary rounded border border-primary/20">
                    <Sparkles className="w-3 h-3" />
                    AI Organized
                  </div>
                )}
              </div>

              {/* Render execution checklist */}
              {task.subtasks && task.subtasks.length > 0 && (
                <div className="mt-3.5 pt-3.5 border-t border-border/40 space-y-2">
                  <ul className="space-y-2">
                    {task.subtasks.map((st) => (
                      <li key={st.id} className="flex items-center gap-3">
                        <Checkbox 
                          checked={st.completed} 
                          onCheckedChange={() => toggleSubtask(task.id, st.id)}
                          className="w-4.5 h-4.5 rounded"
                        />
                        <span className={`text-sm flex-1 ${st.completed ? 'line-through text-muted-foreground' : 'text-foreground font-medium'}`}>
                          {st.title}
                        </span>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border/60">
                          {st.estimatedMinutes}m
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </Card>
      </motion.div>
    );
  };

  const todayStr = getTaskDateString(new Date().toISOString());
  const dueTodayTasks = sortedTasks.filter(t => getTaskDateString(t.dueDate) === todayStr);
  const otherTasks = sortedTasks.filter(t => getTaskDateString(t.dueDate) !== todayStr);

  return (
    <div className="max-w-7xl mx-auto pb-20 px-4 sm:px-6 md:px-8">
      {/* Header section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 pb-8 mb-8 border-b border-border/40">
        <div>
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-foreground font-sans">
            Tasks Center
          </h2>
          <p className="text-muted-foreground mt-2 text-sm md:text-base font-medium">
            Edit, group, and automate task scheduling. Add multiples simultaneously or restore archived schedules.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <Button 
            variant="outline"
            onClick={simulateDeadlineAlert}
            className="flex-1 md:flex-none gap-2 font-medium bg-transparent border-border/60 hover:bg-muted/50 rounded-xl"
            title="Test Voice Alert"
          >
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="hidden sm:inline">Voice Alert</span>
          </Button>
          <Button 
            variant="outline"
            onClick={playPendingTasks} 
            className={`flex-1 md:flex-none gap-2 font-medium bg-transparent border-border/60 hover:bg-muted/50 rounded-xl transition-colors ${isPlayingTasks ? 'bg-primary/10 text-primary border-primary/50' : ''}`}
          >
            {isPlayingTasks ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-500" />}
            <span className="hidden sm:inline">{isPlayingTasks ? 'Stop Audio' : 'Play Speech'}</span>
          </Button>
          <Button 
            onClick={() => setIsMultiAddOpen(true)} 
            className="flex-1 md:flex-none gap-2 font-medium bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-xl shadow-sm"
          >
            <PlusSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Add Multiple</span>
          </Button>
          <Button onClick={() => window.dispatchEvent(new Event('open-task-modal'))} className="flex-1 md:flex-none gap-2 font-medium shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Task</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Sidebar */}
        <div className="w-full lg:w-72 shrink-0 space-y-6">
          {/* Search bar */}
          <Card className="border-border/40 bg-card/40 backdrop-blur-md rounded-2xl p-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search tasks or steps..."
                className="pl-9 bg-background/50 border-border/50 rounded-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </Card>

          {/* Categories Sidebar Selection */}
          <Card className="border-border/40 bg-card/40 backdrop-blur-md rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-2">Categories</h3>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2.5 ${
                  selectedCategory === null 
                    ? 'bg-primary/10 text-primary shadow-sm' 
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <Grid className="w-4 h-4" />
                All Categories
              </button>
              {['Work', 'Personal', 'Study', 'Shopping', 'Health', 'Errands'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-between ${
                    selectedCategory === cat 
                      ? 'bg-primary/10 text-primary shadow-sm' 
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    {getCategoryIcon(cat)}
                    {cat}
                  </span>
                  <span className="text-xs opacity-60 font-mono">
                    {tasks.filter(t => t.category === cat).length}
                  </span>
                </button>
              ))}
            </div>
          </Card>

          {/* Priority filter */}
          <Card className="border-border/40 bg-card/40 backdrop-blur-md rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-2">Priority Levels</h3>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedPriorityFilter(null)}
                className={`w-full text-left px-3.5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2.5 ${
                  selectedPriorityFilter === null 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                All Urgency
              </button>
              <button
                onClick={() => setSelectedPriorityFilter('High')}
                className={`w-full text-left px-3.5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-between ${
                  selectedPriorityFilter === 'High' 
                    ? 'bg-rose-500/10 text-rose-500' 
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  High Priority
                </span>
                <span className="text-xs font-mono">{tasks.filter(t => t.priority === 'High').length}</span>
              </button>
              <button
                onClick={() => setSelectedPriorityFilter('Medium')}
                className={`w-full text-left px-3.5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-between ${
                  selectedPriorityFilter === 'Medium' 
                    ? 'bg-amber-500/10 text-amber-500' 
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  Medium Priority
                </span>
                <span className="text-xs font-mono">{tasks.filter(t => t.priority === 'Medium').length}</span>
              </button>
              <button
                onClick={() => setSelectedPriorityFilter('Low')}
                className={`w-full text-left px-3.5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-between ${
                  selectedPriorityFilter === 'Low' 
                    ? 'bg-emerald-500/10 text-emerald-500' 
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  Low Priority
                </span>
                <span className="text-xs font-mono">{tasks.filter(t => t.priority === 'Low').length}</span>
              </button>
            </div>
          </Card>

          {/* Sort Menu */}
          <Card className="border-border/50 bg-card/60 backdrop-blur-sm p-5 space-y-3">
            <h3 className="text-xs font-bold text-muted-foreground tracking-widest uppercase">Sort Arrangement</h3>
            <div className="space-y-1 text-sm">
              <button
                onClick={() => setSortOption(null)}
                className={`w-full text-left px-3 py-1.5 rounded-md font-medium transition-colors ${
                  sortOption === null ? 'text-primary' : 'text-muted-foreground hover:text-white'
                }`}
              >
                • Default Creation Order
              </button>
              <button
                onClick={() => setSortOption('date-closest')}
                className={`w-full text-left px-3 py-1.5 rounded-md font-medium transition-colors ${
                  sortOption === 'date-closest' ? 'text-primary' : 'text-muted-foreground hover:text-white'
                }`}
              >
                • Due Date (Closest)
              </button>
              <button
                onClick={() => setSortOption('priority-desc')}
                className={`w-full text-left px-3 py-1.5 rounded-md font-medium transition-colors ${
                  sortOption === 'priority-desc' ? 'text-primary' : 'text-muted-foreground hover:text-white'
                }`}
              >
                • Priority (High to Low)
              </button>
              <button
                onClick={() => setSortOption('priority-asc')}
                className={`w-full text-left px-3 py-1.5 rounded-md font-medium transition-colors ${
                  sortOption === 'priority-asc' ? 'text-primary' : 'text-muted-foreground hover:text-white'
                }`}
              >
                • Priority (Low to High)
              </button>
              <button
                onClick={() => setSortOption('alpha')}
                className={`w-full text-left px-3 py-1.5 rounded-md font-medium transition-colors ${
                  sortOption === 'alpha' ? 'text-primary' : 'text-muted-foreground hover:text-white'
                }`}
              >
                • Alphabetical Name
              </button>
            </div>
          </Card>

          {/* Archived & Deleted History panel */}
          <Card className="border-border/50 bg-card/60 backdrop-blur-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-muted-foreground tracking-widest uppercase flex items-center gap-1.5">
                <Archive className="w-3.5 h-3.5" />
                Archived & Deleted
              </h3>
              <Badge variant="outline" className="text-[10px] px-1.5 font-mono bg-muted/40 text-muted-foreground border-border/40">
                {deletedTasks.length} total
              </Badge>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {deletedTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-4">No recently deleted tasks.</p>
              ) : (
                deletedTasks.slice(0, 5).map((dt, idx) => (
                  <div key={dt.id || idx} className="p-2 rounded bg-muted/30 border border-border/40 text-xs flex flex-col gap-1.5">
                    <div className="flex items-start justify-between">
                      <span className="font-semibold text-foreground truncate max-w-[130px]">{dt.title}</span>
                      <span className="text-[10px] opacity-60 font-mono bg-muted px-1 rounded">{dt.category || 'General'}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-border/20">
                      <span className="text-[9px] text-muted-foreground">Deleted</span>
                      <Button 
                        onClick={() => restoreArchivedTask(dt)}
                        variant="ghost" 
                        size="sm" 
                        className="h-5 px-1.5 text-[10px] text-primary hover:bg-primary/5 font-bold flex items-center gap-1"
                      >
                        <Undo className="w-2.5 h-2.5" />
                        Restore
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Right Tasks Grid List Area */}
        <div className="flex-1 space-y-4">
          {sortedTasks.length > 0 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-card p-3.5 rounded-xl border border-border/50 gap-4">
              <div className="flex items-center gap-3 pl-2.5">
                <Checkbox 
                  checked={selectedTasks.length > 0 && selectedTasks.length === sortedTasks.length}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedTasks(sortedTasks.map(t => t.id));
                    } else {
                      setSelectedTasks([]);
                    }
                  }}
                  className="w-5 h-5 rounded"
                />
                <span className="text-sm font-semibold text-muted-foreground">Select All Shown Tasks</span>
              </div>
              
              {selectedTasks.length > 0 && (
                <div className="flex items-center gap-3 w-full sm:w-auto shrink-0 justify-end">
                  <Select onValueChange={(val: any) => updateSelectedTasksPriority(val)}>
                    <SelectTrigger className="h-8.5 text-sm w-[140px] border-border/50 bg-background shadow-none">
                      <SelectValue placeholder="Set Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High" className="text-rose-500 font-medium">High</SelectItem>
                      <SelectItem value="Medium" className="text-amber-500 font-medium">Medium</SelectItem>
                      <SelectItem value="Low" className="text-emerald-500 font-medium">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => setIsBulkDeleteOpen(true)}
                    className="h-8.5 text-xs font-semibold bg-rose-600 hover:bg-rose-500"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Delete ({selectedTasks.length})
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="space-y-8">
            {dueTodayTasks.length > 0 && (
              <section className="space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2 text-rose-400">
                  <CalendarDays className="w-5 h-5" />
                  Execution Slots • Due Today
                </h3>
                <div className="space-y-4">
                  <AnimatePresence>
                    {dueTodayTasks.map(renderTaskCard)}
                  </AnimatePresence>
                </div>
              </section>
            )}

            {otherTasks.length > 0 && (
              <section className="space-y-4 pt-4">
                <h3 className="text-lg font-bold flex items-center gap-2 text-muted-foreground">
                  Scheduled Pipeline • Upcoming & Other Dates
                </h3>
                <div className="space-y-4">
                  <AnimatePresence>
                    {otherTasks.map(renderTaskCard)}
                  </AnimatePresence>
                </div>
              </section>
            )}

            {tasks.length === 0 && (
              <Card className="text-center py-20 border-border/50 bg-card/60 backdrop-blur-sm p-6 max-w-xl mx-auto">
                <CheckSquare className="w-14 h-14 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-xl font-bold tracking-tight text-white">Your schedule is clean</h3>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed max-w-xs mx-auto">
                  All task boards are fully executed! Speak a memo or open the AI Task builder to generate clean action items.
                </p>
                <div className="flex justify-center gap-3 mt-6">
                  <Button onClick={() => setIsMultiAddOpen(true)} variant="outline" className="gap-2">
                    <PlusSquare className="w-4 h-4 text-primary" />
                    Add Multiple
                  </Button>
                  <Button onClick={() => window.dispatchEvent(new Event('open-task-modal'))} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Create Single Task
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* DIALOG FOR EDITING SPECIFIC TASK DETAILS */}
      <Dialog open={taskToEdit !== null} onOpenChange={(open) => !open && setTaskToEdit(null)}>
        <DialogContent className="max-w-2xl bg-card border border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
              <Pencil className="w-5 h-5 text-indigo-400" />
              Modify Task Blueprint
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Directly edit titles, execution checklist, scheduling constraints, or estimate completion times.
            </DialogDescription>
          </DialogHeader>

          {taskToEdit && (
            <div className="space-y-5 py-4 text-foreground">
              {/* Title & Description */}
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Task Title</label>
                  <Input 
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="bg-muted/40 border-border"
                    placeholder="Enter short active task name"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Context & Notes</label>
                  <Textarea 
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="bg-muted/40 border-border min-h-[80px]"
                    placeholder="Provide description context or client requirements..."
                  />
                </div>
              </div>

              {/* Grid of details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Urgency Priority</label>
                  <Select 
                    value={editPriority} 
                    onValueChange={(val: any) => setEditPriority(val)}
                  >
                    <SelectTrigger className="bg-muted/40 border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High" className="text-rose-500 font-bold">High Urgency</SelectItem>
                      <SelectItem value="Medium" className="text-amber-500 font-bold">Medium Priority</SelectItem>
                      <SelectItem value="Low" className="text-emerald-500 font-bold">Low Priority</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Category Category</label>
                  <Select 
                    value={editCategory} 
                    onValueChange={(val: any) => setEditCategory(val)}
                  >
                    <SelectTrigger className="bg-muted/40 border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['Work', 'Personal', 'Study', 'Shopping', 'Health', 'Errands', 'General'].map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Target Date</label>
                  <Input 
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="bg-muted/40 border-border"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Estimated Minutes</label>
                  <Input 
                    type="number"
                    value={editEstimatedMinutes}
                    onChange={(e) => setEditEstimatedMinutes(parseInt(e.target.value) || 0)}
                    className="bg-muted/40 border-border"
                    min="1"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Recurrence Interval</label>
                  <Select 
                    value={editRecurring} 
                    onValueChange={(val: any) => setEditRecurring(val)}
                  >
                    <SelectTrigger className="bg-muted/40 border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="None">None (One-time)</SelectItem>
                      <SelectItem value="Daily">Daily Interval</SelectItem>
                      <SelectItem value="Weekly">Weekly Interval</SelectItem>
                      <SelectItem value="Monthly">Monthly Interval</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Execution subtasks editor */}
              <div className="border-t border-border/60 pt-4 space-y-3.5">
                <h4 className="text-xs font-bold text-muted-foreground tracking-widest uppercase flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-primary" />
                  Subtasks Execution List
                </h4>
                
                {/* Add new subtask row */}
                <div className="flex gap-2.5">
                  <Input 
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    placeholder="Enter next subtask action step..."
                    className="flex-1 bg-muted/40 border-border text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && addEditSubtask()}
                  />
                  <div className="flex items-center gap-1 shrink-0 w-24">
                    <Input 
                      type="number" 
                      value={newSubtaskMinutes} 
                      onChange={(e) => setNewSubtaskMinutes(parseInt(e.target.value) || 5)}
                      className="bg-muted/40 border-border text-sm"
                      title="Minutes estimate"
                      min="1"
                    />
                    <span className="text-xs text-muted-foreground font-mono">m</span>
                  </div>
                  <Button onClick={addEditSubtask} type="button" className="h-10 px-3 bg-secondary text-secondary-foreground hover:bg-secondary/85">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {/* Subtask list */}
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {editSubtasks.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic text-center py-2.5">No action steps added yet.</p>
                  ) : (
                    editSubtasks.map((st) => (
                      <div key={st.id} className="flex items-center justify-between p-2 rounded bg-muted/20 border border-border/40 gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <Checkbox 
                            checked={st.completed}
                            onCheckedChange={(checked) => {
                              setEditSubtasks(editSubtasks.map(s => s.id === st.id ? { ...s, completed: !!checked } : s));
                            }}
                            className="w-4 h-4 rounded"
                          />
                          <span className={`text-sm truncate font-medium ${st.completed ? 'line-through text-muted-foreground' : 'text-white'}`}>{st.title}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-mono opacity-70 bg-muted px-2 py-0.5 rounded border border-border/60">{st.estimatedMinutes}m</span>
                          <Button 
                            onClick={() => removeEditSubtask(st.id)}
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-muted-foreground hover:text-rose-500"
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="border-t border-border/40 pt-4 gap-2">
            <Button onClick={() => setTaskToEdit(null)} variant="outline">
              Cancel
            </Button>
            <Button onClick={saveEditedTask} className="bg-primary text-primary-foreground font-semibold">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG FOR BATCH MULTIPLE TASKS CREATION */}
      <Dialog open={isMultiAddOpen} onOpenChange={setIsMultiAddOpen}>
        <DialogContent className="max-w-3xl bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
              <PlusSquare className="w-5 h-5 text-indigo-400" />
              Batch Multi-Task Builder
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Write or copy-paste multiple tasks, one title per line. They will be added instantly into your schedules.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 py-4">
            {/* Input column */}
            <div className="lg:col-span-7 space-y-2 flex flex-col h-[300px]">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Task Titles (1 per line)</span>
                <span className="font-mono text-[10px] opacity-70">{multiAddText.split('\n').filter(Boolean).length} tasks recognized</span>
              </label>
              <Textarea 
                value={multiAddText}
                onChange={(e) => setMultiAddText(e.target.value)}
                className="flex-1 bg-muted/40 border-border text-sm min-h-[150px] font-sans resize-none placeholder:opacity-50"
                placeholder="Submit quarterly financial statement&#10;Consult medical physician regarding lab checkups&#10;Finalize presentation deck for client board&#10;Purchase grocery supply and kitchen spices"
              />
            </div>

            {/* Default values preset column */}
            <div className="lg:col-span-5 bg-muted/25 border border-border/60 rounded-xl p-4 space-y-4">
              <h4 className="text-xs font-bold text-muted-foreground tracking-widest uppercase">Apply to All Presets</h4>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Urgency Priority</label>
                  <Select value={multiDefaultPriority} onValueChange={(val: any) => setMultiDefaultPriority(val)}>
                    <SelectTrigger className="h-8.5 text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High" className="text-rose-500">High</SelectItem>
                      <SelectItem value="Medium" className="text-amber-500">Medium</SelectItem>
                      <SelectItem value="Low" className="text-emerald-500">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Category</label>
                  <Select value={multiDefaultCategory} onValueChange={(val: any) => setMultiDefaultCategory(val)}>
                    <SelectTrigger className="h-8.5 text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['Work', 'Personal', 'Study', 'Shopping', 'Health', 'Errands', 'General'].map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Estimated Minutes</label>
                  <Input 
                    type="number"
                    value={multiDefaultMinutes}
                    onChange={(e) => setMultiDefaultMinutes(parseInt(e.target.value) || 15)}
                    className="h-8.5 text-xs bg-background"
                    min="1"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Scheduled Date</label>
                  <Input 
                    type="date"
                    value={multiDefaultDate}
                    onChange={(e) => setMultiDefaultDate(e.target.value)}
                    className="h-8.5 text-xs bg-background"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-border/40 pt-4">
            <Button onClick={() => setIsMultiAddOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button 
              onClick={handleBulkCreateTasks}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5"
              disabled={!multiAddText.trim()}
            >
              Add All Tasks
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG TO SWAP / REPLACE TASK SLOTS */}
      <Dialog open={taskToSwap !== null} onOpenChange={(open) => !open && setTaskToSwap(null)}>
        <DialogContent className="max-w-md bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
              <RefreshCw className="w-5 h-5 text-sky-400" />
              Swap Task Slots
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Swap properties, steps, priority and schedule configurations between two tasks in your scheduler.
            </DialogDescription>
          </DialogHeader>

          {taskToSwap && (
            <div className="space-y-4 py-3 text-foreground text-sm">
              <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
                <span className="text-xs font-bold text-muted-foreground block uppercase mb-1">Task A (Selected)</span>
                <span className="font-semibold text-white">{taskToSwap.title}</span>
                <span className="text-[10px] opacity-65 block mt-1">{taskToSwap.category} • {taskToSwap.priority} Urgency</span>
              </div>

              <div className="flex justify-center text-muted-foreground animate-pulse">
                ⇄
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Swap positions with Task B</label>
                {tasks.filter(t => t.id !== taskToSwap.id).length === 0 ? (
                  <p className="text-xs text-rose-400 italic">No other active tasks available to swap with. Create another task first.</p>
                ) : (
                  <Select value={swapTargetId} onValueChange={setSwapTargetId}>
                    <SelectTrigger className="bg-muted/40 border-border w-full text-left">
                      <SelectValue placeholder="Select target task..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {tasks.filter(t => t.id !== taskToSwap.id).map(t => (
                        <SelectItem key={t.id} value={t.id} className="text-xs">
                          {t.title} ({t.category || 'General'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="pt-3">
            <Button onClick={() => setTaskToSwap(null)} variant="outline">
              Cancel
            </Button>
            <Button 
              onClick={executeSwapTasks} 
              className="bg-primary text-primary-foreground font-semibold"
              disabled={!swapTargetId}
            >
              Execute Swap
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ALERT DIALOG BULK DELETE */}
      <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete & Archive Selected Tasks</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to remove and archive these {selectedTasks.length} selected task(s)? They will be logged in recently deleted and can be recovered if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={removeSelectedTasks}
              className="bg-rose-600 text-white hover:bg-rose-500"
            >
              Archive All Selected
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ALERT DIALOG SINGLE DELETE */}
      <AlertDialog open={taskToDelete !== null} onOpenChange={(open) => !open && setTaskToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Archive Task confirmation</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will remove this task from your active view and transfer it into recently deleted sidebar archive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (taskToDelete) {
                  removeTask(taskToDelete);
                  setTaskToDelete(null);
                }
              }}
              className="bg-rose-600 text-white hover:bg-rose-500"
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
