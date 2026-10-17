import React, { useState, useEffect } from 'react';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Grid,
  User,
  ShieldAlert,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import {
  startPhoneRingtone,
  stopPhoneRingtone,
  speakCallerDialogue,
  stopCallerSpeech,
  stopAllAudio,
} from '../utils/safetyAudio.ts';

export interface FakeCallPreset {
  id: string;
  callerName: string;
  relationship: string;
  callerNumber: string;
  avatarBg: string;
  dialogue: string;
}

interface FakeCallModalProps {
  isOpen: boolean;
  preset: FakeCallPreset;
  onClose: () => void;
}

export function FakeCallModal({ isOpen, preset, onClose }: FakeCallModalProps) {
  const [callState, setCallState] = useState<'incoming' | 'active'>('incoming');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [showTranscript, setShowTranscript] = useState(true);

  // Trigger ringtone on incoming call
  useEffect(() => {
    if (!isOpen) {
      setCallState('incoming');
      setCallDuration(0);
      stopAllAudio();
      return;
    }

    if (callState === 'incoming') {
      startPhoneRingtone();
      // Try haptic vibration if supported
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate([400, 200, 400, 200, 600]);
        } catch {}
      }
    }

    return () => {
      stopAllAudio();
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate(0);
        } catch {}
      }
    };
  }, [isOpen, callState]);

  // Handle call timer and speaking dialogue
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (callState === 'active') {
      stopPhoneRingtone();
      // Speak the dialogue
      speakCallerDialogue(preset.dialogue, preset.callerName);

      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callState, preset]);

  if (!isOpen) return null;

  const handleAccept = () => {
    stopPhoneRingtone();
    setCallState('active');
  };

  const handleDecline = () => {
    stopAllAudio();
    onClose();
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between p-6 sm:p-10 select-none font-sans text-white animate-in fade-in duration-200">
      {/* Top Bar / Status */}
      <div className="flex items-center justify-between text-xs text-neutral-400 max-w-md mx-auto w-full pt-4">
        <span className="flex items-center gap-1.5 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          {callState === 'incoming' ? 'Incoming Call' : 'Call in Progress'}
        </span>
        <button
          onClick={handleDecline}
          className="text-neutral-500 hover:text-neutral-300 text-xs cursor-pointer px-2 py-1 rounded bg-neutral-900 border border-neutral-800"
        >
          Exit Simulator
        </button>
      </div>

      {/* Caller Info */}
      <div className="flex flex-col items-center justify-center my-auto text-center max-w-md mx-auto w-full">
        {/* Avatar */}
        <div
          className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold shadow-xl border-2 border-white/20 mb-5 ${preset.avatarBg}`}
        >
          {preset.callerName.charAt(0)}
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-1">
          {preset.callerName}
        </h2>
        <p className="text-sm text-neutral-400 font-medium mb-1">{preset.relationship}</p>
        <p className="text-xs text-neutral-500 font-mono tracking-wider">
          {callState === 'incoming' ? preset.callerNumber : formatTimer(callDuration)}
        </p>

        {/* Live Subtitle Transcript (Helps the user know what to respond to) */}
        {callState === 'active' && (
          <div className="mt-6 w-full max-w-sm bg-neutral-900/90 border border-neutral-800 rounded-xl p-3.5 text-left text-xs backdrop-blur-md">
            <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1.5 pb-1 border-b border-neutral-800">
              <span className="flex items-center gap-1 font-medium text-emerald-400">
                <Sparkles className="w-3 h-3" />
                Audio Script Playing Aloud:
              </span>
              <span className="text-[10px] text-neutral-500">Respond aloud to sound natural</span>
            </div>
            <p className="text-neutral-200 italic leading-relaxed">
              "{preset.dialogue}"
            </p>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="max-w-md mx-auto w-full pb-8">
        {callState === 'incoming' ? (
          /* Incoming Call Buttons */
          <div className="flex items-center justify-around">
            {/* Decline Button */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={handleDecline}
                className="w-18 h-18 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center shadow-lg shadow-red-900/50 transition-transform active:scale-95 cursor-pointer"
              >
                <PhoneOff className="w-8 h-8 text-white" />
              </button>
              <span className="text-xs text-neutral-400 font-medium">Decline</span>
            </div>

            {/* Accept Button */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={handleAccept}
                className="w-18 h-18 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-900/50 transition-transform active:scale-95 cursor-pointer animate-bounce"
              >
                <Phone className="w-8 h-8 text-white" />
              </button>
              <span className="text-xs text-neutral-400 font-medium">Accept Call</span>
            </div>
          </div>
        ) : (
          /* Active Call In-Call Controls */
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto w-full">
              {/* Mute */}
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`p-4 rounded-full flex flex-col items-center justify-center gap-1.5 transition-colors ${
                  isMuted ? 'bg-white text-black' : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                <span className="text-[10px]">Mute</span>
              </button>

              {/* Keypad */}
              <button className="p-4 rounded-full bg-neutral-900 text-neutral-300 hover:bg-neutral-800 flex flex-col items-center justify-center gap-1.5">
                <Grid className="w-5 h-5" />
                <span className="text-[10px]">Keypad</span>
              </button>

              {/* Speaker */}
              <button
                onClick={() => setIsSpeaker(!isSpeaker)}
                className={`p-4 rounded-full flex flex-col items-center justify-center gap-1.5 transition-colors ${
                  isSpeaker ? 'bg-white text-black' : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                {isSpeaker ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                <span className="text-[10px]">Speaker</span>
              </button>
            </div>

            {/* End Call Button */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={handleDecline}
                className="w-18 h-18 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center shadow-lg shadow-red-900/50 transition-transform active:scale-95 cursor-pointer"
              >
                <PhoneOff className="w-8 h-8 text-white" />
              </button>
              <span className="text-xs text-neutral-400 font-medium">End Call</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
