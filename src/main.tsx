import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

// Safe Speech Synthesis and Battery API Polyfill / Guard for iframe sandbox safety
if (typeof window !== 'undefined') {
  // Guard SpeechSynthesisUtterance if missing
  if (!('SpeechSynthesisUtterance' in window)) {
    (window as any).SpeechSynthesisUtterance = class {
      text = '';
      lang = '';
      pitch = 1.0;
      rate = 1.0;
      onstart = () => {};
      onend = () => {};
      onerror = () => {};
      constructor(text?: string) {
        this.text = text || '';
      }
    };
  }

  // Guard speechSynthesis
  if (!('speechSynthesis' in window) || !window.speechSynthesis) {
    (window as any).speechSynthesis = {
      speak: () => {},
      cancel: () => {},
      pause: () => {},
      resume: () => {},
      getVoices: () => [],
      pending: false,
      speaking: false,
      paused: false,
    };
  } else {
    // If it exists, wrap its methods in safe try-catch wrappers
    const originalSpeak = window.speechSynthesis.speak;
    const originalCancel = window.speechSynthesis.cancel;
    
    try {
      window.speechSynthesis.speak = function(utterance) {
        try {
          originalSpeak.call(window.speechSynthesis, utterance);
        } catch (e) {
          console.warn('speechSynthesis.speak failed:', e);
          // Trigger onend or onerror if defined
          if (utterance) {
            setTimeout(() => {
              if (typeof utterance.onerror === 'function') {
                utterance.onerror(new Event('error') as any);
              } else if (typeof utterance.onend === 'function') {
                utterance.onend(new Event('end') as any);
              }
            }, 100);
          }
        }
      };
    } catch (e) {
      console.warn('Failed to wrap speechSynthesis.speak:', e);
    }

    try {
      window.speechSynthesis.cancel = function() {
        try {
          originalCancel.call(window.speechSynthesis);
        } catch (e) {
          console.warn('speechSynthesis.cancel failed:', e);
        }
      };
    } catch (e) {
      console.warn('Failed to wrap speechSynthesis.cancel:', e);
    }
  }

  // Guard navigator.getBattery against sandbox iframe SecurityErrors or promise rejections
  if (navigator && 'getBattery' in navigator) {
    const originalGetBattery = (navigator as any).getBattery;
    (navigator as any).getBattery = function() {
      try {
        return originalGetBattery.call(navigator).catch((err: any) => {
          console.warn('getBattery rejected:', err);
          return {
            charging: true,
            level: 1,
            addEventListener: () => {},
            removeEventListener: () => {},
          };
        });
      } catch (e) {
        console.warn('getBattery call failed:', e);
        return Promise.resolve({
          charging: true,
          level: 1,
          addEventListener: () => {},
          removeEventListener: () => {},
        });
      }
    };
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
);
