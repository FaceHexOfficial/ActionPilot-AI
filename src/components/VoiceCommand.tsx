import { useState, useRef, useEffect } from 'react';
import { Mic, Square } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button } from './ui/button';
import { apiFetch } from '../lib/utils';

export default function VoiceCommand({ onCommandResult }: { onCommandResult: (result: any) => void }) {
  const [isRecording, setIsRecording] = useState(false);
  const recognition = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = false;
      recognition.current.interimResults = false;
      recognition.current.lang = 'en-US';

      recognition.current.onresult = async (event: any) => {
        const transcript = event.results[0][0].transcript;
        setIsRecording(false);
        processCommand(transcript);
      };

      recognition.current.onerror = (event: any) => {
        console.error('Speech recognition error', event);
        setIsRecording(false);
        toast.error('Voice recognition failed.');
      };
    }
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognition.current?.stop();
      setIsRecording(false);
    } else {
      if (recognition.current) {
        recognition.current.start();
        setIsRecording(true);
      } else {
        toast.error('Browser does not support voice recognition.');
      }
    }
  };

  const processCommand = async (prompt: string) => {
    try {
      const response = await apiFetch('/api/ai/analyze-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const result = await response.json();
      onCommandResult(result);
      toast.success('Command processed!');
    } catch (error) {
      console.error('Error processing voice command:', error);
      toast.error('Failed to process command.');
    }
  };

  return (
    <Button
      onClick={toggleRecording}
      className={`rounded-full h-10 w-10 p-0 ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-primary'}`}
      title="Voice Command"
    >
      {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
    </Button>
  );
}
