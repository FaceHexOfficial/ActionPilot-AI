import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ActivityLogEntry } from '../types';
import { CheckSquare, Zap, Target, Activity } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getActivities } from '../lib/activity';

export default function ActivityLogWidget() {
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);

  useEffect(() => {
    const loadActivities = () => {
      setActivities(getActivities());
    };

    loadActivities();
    window.addEventListener('activity_updated', loadActivities);
    return () => window.removeEventListener('activity_updated', loadActivities);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'task_completed':
        return <CheckSquare className="w-4 h-4 text-green-500" />;
      case 'automation_triggered':
        return <Zap className="w-4 h-4 text-primary" />;
      case 'task_created':
        return <Target className="w-4 h-4 text-blue-500" />;
      default:
        return <Activity className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-xl flex flex-col">
      <CardHeader className="pb-3 border-b border-border/10">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Activity Log
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-y-auto max-h-[250px]">
        {activities.length > 0 ? (
          <div className="flex flex-col">
            {activities.map((activity) => (
              <div 
                key={activity.id} 
                className="flex items-start gap-3 p-4 border-b border-border/5 last:border-0 hover:bg-muted/10 transition-colors"
              >
                <div className="mt-0.5 p-1.5 bg-background rounded-md border shadow-sm">
                  {getIcon(activity.type)}
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">{activity.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatTime(activity.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-muted-foreground">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No recent activity.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
