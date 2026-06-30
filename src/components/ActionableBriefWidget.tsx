import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Volume2, VolumeX, Sparkles, Loader2, Play, Square, RotateCcw } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Task } from '../types';
import { apiFetch } from '../lib/utils';
import { toast } from 'react-hot-toast';

interface ActionableBriefWidgetProps {
  todayPendingTasks: Task[];
}

export default function ActionableBriefWidget({ todayPendingTasks }: ActionableBriefWidgetProps) {
  const [brief, setBrief] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Stop speaking on unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleGenerateAndPlay = async (forceRegenerate = false) => {
    // If already playing, stop it
    if (isPlaying) {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsPlaying(false);
      return;
    }

    // If we already have the brief and don't force regenerate, just play it
    if (brief && !forceRegenerate) {
      playSpeech(brief);
      return;
    }

    if (todayPendingTasks.length === 0) {
      const emptyMessage = "You have no pending tasks scheduled for today. Outstanding job! Enjoy your day, or take this opportunity to relax.";
      setBrief(emptyMessage);
      playSpeech(emptyMessage);
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiFetch('/api/ai/today-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: todayPendingTasks }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const textToPlay = data.brief || "Let's tackle your tasks today one by one!";
      setBrief(textToPlay);
      playSpeech(textToPlay);
    } catch (error) {
      console.error('Failed to fetch actionable audio brief:', error);
      toast.error('Could not generate the AI audio brief. Playing offline summary.');
      
      // Generate a simple offline brief
      const titles = todayPendingTasks.slice(0, 3).map(t => t.title).join(', ');
      const offlineBrief = `Today you have ${todayPendingTasks.length} pending tasks, including: ${titles}. Let's stay focused and get them done!`;
      setBrief(offlineBrief);
      playSpeech(offlineBrief);
    } finally {
      setIsLoading(false);
    }
  };

  const playSpeech = (text: string) => {
    if (!window.speechSynthesis) {
      toast.error('Speech synthesis is not supported in this browser.');
      return;
    }

    // Stop any existing speech
    window.speechSynthesis.cancel();

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;

      utterance.onstart = () => {
        setIsPlaying(true);
      };

      utterance.onend = () => {
        setIsPlaying(false);
      };

      utterance.onerror = (e) => {
        console.error('Speech synthesis error:', e);
        setIsPlaying(false);
      };

      // Set nice voice properties
      utterance.rate = 0.95; // Slightly slower for better clarity
      utterance.pitch = 1.05; // Friendly high pitch

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('Failed to play speech synthesis:', err);
      setIsPlaying(false);
    }
  };

  const handleStop = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
  };

  return (
    <Card className="border-border/50 bg-card/60 backdrop-blur-sm shadow-xl relative overflow-hidden transition-all hover:shadow-2xl hover:bg-card/85 rounded-2xl group border-l-4 border-l-yellow-500">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="flex h-2 w-2 relative">
              {isPlaying && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isPlaying ? 'bg-yellow-500' : 'bg-muted-foreground/30'}`}></span>
            </span>
            <span className="text-[10px] font-bold text-yellow-600 dark:text-yellow-400 uppercase tracking-widest">
              AI Action Pilot
            </span>
          </div>
          <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-foreground">
            <Volume2 className="w-4 h-4 text-yellow-500" />
            Today's Spoken Brief
          </CardTitle>
          <CardDescription className="text-[11px] text-muted-foreground">
            Let the AI summarize and speak your agenda.
          </CardDescription>
        </div>
        
        {brief && !isLoading && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleGenerateAndPlay(true)}
            className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full transition-transform hover:rotate-45"
            title="Regenerate Brief"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        )}
      </CardHeader>

      <CardContent className="p-4 pt-0">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-yellow-500" />
            <p className="text-xs font-semibold animate-pulse">Consulting flight path...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {brief ? (
              <div className="relative bg-secondary/30 border border-border/20 rounded-xl p-3 text-xs leading-relaxed text-foreground transition-all duration-300">
                {isPlaying && (
                  <div className="absolute right-3 top-3 flex items-center gap-1">
                    <span className="w-1 h-3 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <span className="w-1 h-4 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                    <span className="w-1 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                )}
                <p className="font-medium pr-6">{brief}</p>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                You have <span className="font-bold text-foreground">{todayPendingTasks.length}</span> pending tasks scheduled for today. Click the button to read your briefing out loud.
              </p>
            )}

            <div className="flex gap-2">
              <Button
                onClick={() => handleGenerateAndPlay(false)}
                className={`flex-1 text-xs font-bold h-9 gap-1.5 rounded-xl transition-all ${
                  isPlaying 
                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/10' 
                    : 'bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-black shadow-lg shadow-yellow-500/15'
                }`}
              >
                {isPlaying ? (
                  <>
                    <VolumeX className="w-4 h-4" /> Stop Audio Brief
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-black" /> Play Spoken Brief
                  </>
                )}
              </Button>
              
              {isPlaying && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleStop}
                  className="h-9 w-9 text-muted-foreground hover:text-foreground rounded-xl border-border/40"
                  title="Silence Brief"
                >
                  <Square className="w-4 h-4 fill-current" />
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
