import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square, Loader2, FileText, CheckCircle, AlertCircle } from 'lucide-react';

const API_BASE =
  // if you later add env vars for frontend, use them here
  window.location.hostname === 'localhost'
    ? 'http://localhost:4000'
    : 'https://pulserx.onrender.com';


interface VirtualNotetakerProps {
  patientName: string;
  onAnalysisStatusChange?: (
    status: 'idle' | 'recording' | 'processing' | 'completed' | 'error'
  ) => void;
  onVisitSaved?: () => void;
}

// Minimal typings for Web Speech API
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

type Status = 'idle' | 'recording' | 'processing' | 'completed' | 'error';

const VirtualNotetaker: React.FC<VirtualNotetakerProps> = ({
  patientName,
  onAnalysisStatusChange,
  onVisitSaved,
}) => {
  const [status, setStatus] = useState<Status>('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [recognitionSupported, setRecognitionSupported] = useState(true);

  const recognitionRef = useRef<any>(null);

  // Helper to update status + notify parent
  const setStatusAndNotify = (next: Status) => {
    setStatus(next);
    onAnalysisStatusChange?.(next);
  };

  // Check browser support once
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setRecognitionSupported(false);
      setError(
        'Live transcription is not supported in this browser. Try Chrome on desktop.'
      );
    }
  }, []);

  const startRecording = () => {
    if (!recognitionSupported) {
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setRecognitionSupported(false);
      setError(
        'Live transcription is not supported in this browser. Try Chrome on desktop.'
      );
      return;
    }

    // Reset state
    setTranscript('');
    setError(null);

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let text = '';
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript + ' ';
      }
      setTranscript(text.trim());
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event);
      setError('Speech recognition error: ' + event.error);
      setStatusAndNotify('error');
    };

    recognition.onend = () => {
      // If we manually stopped to save, we'll set status to 'processing'
      // in stopAndSaveRecording(). If it ends unexpectedly while recording,
      // show an error-ish state.
      if (status === 'recording') {
        setStatusAndNotify('error');
        setError('Speech recognition stopped unexpectedly.');
      }
    };

    recognition.start();
    setStatusAndNotify('recording');
  };

  const stopAndSaveRecording = async () => {
    if (status !== 'recording') return;

    // Stop speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn('Error stopping recognition', err);
      }
    }

    setStatusAndNotify('processing');

    const cleanedTranscript = transcript.trim();
    if (!cleanedTranscript) {
      setError('No speech captured. Please try again.');
      setStatusAndNotify('error');
      return;
    }

    try {
      // Save visit + transcript to backend (no audio, just text)
      const res = await fetch('${API_BASE}/api/visits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patient_id: patientName,
          timestamp: new Date().toISOString(),
          raw_transcript: cleanedTranscript,
          status: 'completed',
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed with status ${res.status}`);
      }

      const data = await res.json();
      console.log('✅ Visit saved, SOAP generation started:', data);

      setStatusAndNotify('completed');
      onVisitSaved?.();
    } catch (err) {
      console.error('Error saving visit:', err);
      setError(
        'Error saving visit: ' +
          (err instanceof Error ? err.message : 'Unknown error')
      );
      setStatusAndNotify('error');
    }
  };

  const reset = () => {
    setTranscript('');
    setError(null);
    setStatusAndNotify('idle');
  };

  const isRecording = status === 'recording';
  const isProcessing = status === 'processing';
  const isCompleted = status === 'completed';
  const isError = status === 'error';

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <FileText className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">
              Virtual Notetaker
            </h3>
            <p className="text-xs text-slate-500">
              Live transcription for {patientName}&apos;s visit
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {isRecording && (
            <span className="inline-flex items-center gap-1 text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Recording…
            </span>
          )}
          {isProcessing && (
            <span className="inline-flex items-center gap-1 text-blue-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              Processing &amp; saving…
            </span>
          )}
          {isCompleted && (
            <span className="inline-flex items-center gap-1 text-emerald-400">
              <CheckCircle className="w-3 h-3" />
              Saved &amp; analyzed
            </span>
          )}
          {isError && (
            <span className="inline-flex items-center gap-1 text-red-400">
              <AlertCircle className="w-3 h-3" />
              Error
            </span>
          )}
        </div>
      </div>

      {/* Transcript box */}
      <div className="bg-slate-900/70 border border-slate-700 rounded-lg p-3 mb-3">
        <textarea
          className="w-full bg-transparent text-sm text-slate-100 outline-none resize-none"
          rows={6}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder={
            recognitionSupported
              ? isRecording
                ? 'Listening… live transcript will appear here.'
                : 'Click “Start Recording” and begin speaking. Transcript will show here in real time.'
              : 'Live transcription not supported in this browser.'
          }
        />
      </div>

      {error && (
        <div className="mb-3 text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded p-2 flex items-start gap-2">
          <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {!isRecording && !isProcessing && (
            <button
              type="button"
              onClick={startRecording}
              disabled={!recognitionSupported}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium text-white transition-colors"
            >
              <Mic className="w-4 h-4" />
              Start Recording
            </button>
          )}

          {isRecording && (
            <button
              type="button"
              onClick={stopAndSaveRecording}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-medium text-white transition-colors"
            >
              <Square className="w-4 h-4" />
              Stop &amp; Save
            </button>
          )}

          {!isRecording && !isProcessing && transcript && (
            <button
              type="button"
              onClick={reset}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Clear
            </button>
          )}
        </div>

        <p className="text-[11px] text-slate-500">
          {status === 'completed'
            ? 'Saved to visits and sent for AI SOAP note.'
            : status === 'recording'
            ? 'Speak naturally; we’ll capture the conversation.'
            : 'Model: browser speech recognition → Gemini SOAP note.'}
        </p>
      </div>
    </div>
  );
};

export default VirtualNotetaker;