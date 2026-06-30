import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Sparkles, Target, Loader2, Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getActivities } from '../lib/activity';
import { Task } from '../types';
import { Button } from './ui/button';
import { toast } from 'react-hot-toast';
import { apiFetch } from '../lib/utils';

export default function DailyDigestWidget() {
  const [digest, setDigest] = useState<{ summary: string; priorities: string[] } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleShare = async () => {
    if (!digest) return;
    
    const text = `My Daily Digest:\n\n${digest.summary}\n\nTop Priorities:\n${digest.priorities.map(p => `- ${p}`).join('\n')}`;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Daily Digest from ActionPilot',
          text: text,
        });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success('Digest copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  useEffect(() => {
    const fetchDigest = async () => {
      setIsLoading(true);
      try {
        const activities = getActivities();
        const savedTasks = localStorage.getItem('actionpilot_tasks');
        const tasks: Task[] = savedTasks ? JSON.parse(savedTasks) : [];
        
        if (tasks.length === 0 && activities.length === 0) {
          setDigest({
            summary: "Welcome to ActionPilot! You haven't added any tasks or activity yet. Get started by creating your first task or syncing your calendar to let the AI help you plan.",
            priorities: [
              "Create your first task",
              "Review your profile settings",
              "Connect your calendar (coming soon)"
            ]
          });
          return;
        }

        const res = await apiFetch('/api/ai/daily-digest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tasks, activities })
        });
        
        if (res.ok) {
          const data = await res.json();
          setDigest(data);
        }
      } catch (error) {
        console.error("Failed to fetch daily digest:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDigest();
  }, []);

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-xl flex flex-col h-full">
      <CardHeader className="pb-3 border-b border-border/10 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Daily Digest
        </CardTitle>
        {digest && !isLoading && (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={handleShare} title="Share Digest">
            <Share2 className="w-4 h-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-4 flex-1 flex flex-col gap-4">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2 min-h-[150px]">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-sm">Analyzing tasks and activity...</p>
          </div>
        ) : digest ? (
          <>
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Yesterday's Accomplishments</h4>
              <p className="text-sm leading-relaxed">{digest.summary}</p>
            </div>
            
            <div className="space-y-2 mt-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Top Priorities Today</h4>
              <ul className="space-y-2 mt-2">
                {digest.priorities.map((priority, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <Target className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span className="leading-tight">{priority}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground min-h-[150px]">
            <p className="text-sm text-center">No digest available today.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
