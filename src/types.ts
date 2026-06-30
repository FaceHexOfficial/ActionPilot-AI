export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  priority: 'High' | 'Medium' | 'Low';
  recurring?: 'None' | 'Daily' | 'Weekly' | 'Monthly';
  status: 'Pending' | 'In Progress' | 'Completed' | 'Skipped';
  dueDate: string;
  category?: string;
  estimatedMinutes: number;
  subtasks: Subtask[];
  createdAt: string;
  isAiGenerated: boolean;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  estimatedMinutes: number;
}

export interface ActivityLogEntry {
  id: string;
  type: 'task_completed' | 'task_created' | 'automation_triggered' | 'system' | 'message_sent' | 'routine_completed' | 'connection_established';
  message: string;
  timestamp: string;
  metadata?: any;
}

export interface UserProfile {

  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  productivityScore: number;
  focusTimeToday: number;
}
