import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  ShieldAlert,
  Phone,
  PhoneCall,
  MapPin,
  Users,
  Volume2,
  VolumeX,
  AlertTriangle,
  Radio,
  Share2,
  Copy,
  Check,
  Clock,
  Compass,
  Plus,
  Trash2,
  Heart,
  Navigation,
  Eye,
  EyeOff,
  BatteryCharging,
  Zap,
  Info,
  ExternalLink,
  MessageCircle,
  Siren,
  Bell,
  ChevronRight,
  Calculator as CalcIcon,
} from 'lucide-react';
import { FakeCallModal, FakeCallPreset } from './components/FakeCallModal.tsx';
import {
  startEmergencySiren,
  stopEmergencySiren,
  playHighWhistle,
  playGuardDogBark,
  stopAllAudio,
} from './utils/safetyAudio.ts';

interface CircleMember {
  id: string;
  name: string;
  relation: string;
  phone: string;
  status: 'safe' | 'moving' | 'alert' | 'offline';
  lastSeen: string;
  battery: number;
  locationName: string;
  avatarBg: string;
}

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relation: string;
  isPrimary: boolean;
}

const DEFAULT_PRESETS: FakeCallPreset[] = [
  {
    id: 'dad',
    callerName: 'Dad ❤️',
    relationship: 'Family',
    callerNumber: '+1 (555) 234-5678',
    avatarBg: 'bg-blue-600',
    dialogue:
      "Hey sweetheart! I just parked right outside in the car with the engine running. I see the building entrance. Are you walking out right now? Let me step out to meet you.",
  },
  {
    id: 'police',
    callerName: 'Officer Miller (Local Police)',
    relationship: 'Emergency Authority',
    callerNumber: '911-DISPATCH',
    avatarBg: 'bg-indigo-700',
    dialogue:
      "Hello, this is Officer Miller. We received your safety ping in the grid. Our patrol unit is on your street right now. Keep your phone on speaker and stay in the well-lit area.",
  },
  {
    id: 'brother',
    callerName: 'Big Brother Leo',
    relationship: 'Family',
    callerNumber: '+1 (555) 789-0123',
    avatarBg: 'bg-emerald-700',
    dialogue:
      "Hey sis, where are you? I'm walking towards you right now with the dog. Wait for me right there, I'll be there in thirty seconds.",
  },
  {
    id: 'friend',
    callerName: 'Sarah (Bestie) 👯‍♀️',
    relationship: 'Friend',
    callerNumber: '+1 (555) 345-6789',
    avatarBg: 'bg-purple-600',
    dialogue:
      "Hey girl! I'm standing by the bright convenience store corner waving at you! Turn left and come over here right now, everyone's waiting for you!",
  },
  {
    id: 'cab',
    callerName: 'Ride Driver - Marcus',
    relationship: 'Driver Service',
    callerNumber: '+1 (555) 901-2345',
    avatarBg: 'bg-amber-600',
    dialogue:
      "Hello, this is your driver Marcus in the white sedan. I am double-parked right by your door with the emergency blinkers on. Hop in whenever you're ready.",
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'circle' | 'fakecall' | 'numbers' | 'walk' | 'audio'>('home');
  const [stealthMode, setStealthMode] = useState(false);

  // --- LOCATION & SOS STATE ---
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy: number; time: string } | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [sosActive, setSosActive] = useState(false);
  const [sosCountdown, setSosCountdown] = useState<number | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [sirenPlaying, setSirenPlaying] = useState(false);
  const [strobeActive, setStrobeActive] = useState(false);

  // --- FAKE CALL STATE ---
  const [isFakeCallOpen, setIsFakeCallOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<FakeCallPreset>(DEFAULT_PRESETS[0]);
  const [scheduledTimer, setScheduledTimer] = useState<number | null>(null);
  const [customCallerName, setCustomCallerName] = useState('');
  const [customDialogue, setCustomDialogue] = useState('');

  // --- CIRCLE MEMBERS STATE ---
  const [circleMembers, setCircleMembers] = useState<CircleMember[]>([
    {
      id: '1',
      name: 'Maya Patel',
      relation: 'Sister',
      phone: '+1 555-0192',
      status: 'safe',
      lastSeen: '2 mins ago',
      battery: 92,
      locationName: 'Safe at Campus Library',
      avatarBg: 'bg-pink-600',
    },
    {
      id: '2',
      name: 'Elena Rostova',
      relation: 'Roommate',
      phone: '+1 555-0843',
      status: 'moving',
      lastSeen: 'Just now',
      battery: 76,
      locationName: 'Walking along North Hallway',
      avatarBg: 'bg-purple-600',
    },
    {
      id: '3',
      name: 'Mom',
      relation: 'Parent / Guardian',
      phone: '+1 555-0321',
      status: 'safe',
      lastSeen: '10 mins ago',
      battery: 88,
      locationName: 'Home - Maple Residence',
      avatarBg: 'bg-indigo-600',
    },
    {
      id: '4',
      name: 'Campus Safety Escort',
      relation: 'Security Desk',
      phone: '+1 555-0911',
      status: 'safe',
      lastSeen: 'Live monitor',
      battery: 100,
      locationName: 'Central Gate Station',
      avatarBg: 'bg-blue-600',
    },
  ]);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberRelation, setNewMemberRelation] = useState('Friend');

  // --- EMERGENCY CONTACTS ---
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([
    { id: '1', name: 'Mom (Direct Line)', phone: '+15550321', relation: 'Parent', isPrimary: true },
    { id: '2', name: 'Sister Maya', phone: '+15550192', relation: 'Sister', isPrimary: false },
    { id: '3', name: 'Local Police Dispatch', phone: '911', relation: 'Authorities', isPrimary: true },
    { id: '4', name: 'National Women Helpline', phone: '1091', relation: 'Emergency Support', isPrimary: true },
  ]);
  const [selectedCountry, setSelectedCountry] = useState<'universal' | 'usa' | 'india' | 'uk'>('universal');

  // --- WALK WITH ME JOURNEY COMPANION ---
  const [walkActive, setWalkActive] = useState(false);
  const [walkDestination, setWalkDestination] = useState('Walking to Metro Station');
  const [walkDurationMin, setWalkDurationMin] = useState(15);
  const [walkSecondsLeft, setWalkSecondsLeft] = useState(15 * 60);

  // --- STEALTH CALCULATOR STATE ---
  const [calcDisplay, setCalcDisplay] = useState('0');

  // Get real user location
  const refreshLocation = () => {
    if (!('geolocation' in navigator)) {
      setLocError('Geolocation not supported by this browser.');
      return;
    }
    setLocLoading(true);
    setLocError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        });
        setLocLoading(false);
      },
      (err) => {
        // Fallback default coordinates if denied or unavailable in sandbox
        setUserLocation({
          lat: 37.7749,
          lng: -122.4194,
          accuracy: 15,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
        setLocLoading(false);
        if (err.code === 1) {
          setLocError('Location permission was denied. Using approximate safe demo coords.');
        }
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  useEffect(() => {
    refreshLocation();
  }, []);

  // SOS Countdown logic
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (sosCountdown !== null && sosCountdown > 0) {
      timer = setInterval(() => {
        setSosCountdown((prev) => (prev !== null && prev > 1 ? prev - 1 : 0));
      }, 1000);
    } else if (sosCountdown === 0) {
      setSosCountdown(null);
      setSosActive(true);
      startEmergencySiren();
      setSirenPlaying(true);
      setStrobeActive(true);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [sosCountdown]);

  // Scheduled fake call countdown
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (scheduledTimer !== null && scheduledTimer > 0) {
      timer = setInterval(() => {
        setScheduledTimer((prev) => (prev !== null && prev > 1 ? prev - 1 : 0));
      }, 1000);
    } else if (scheduledTimer === 0) {
      setScheduledTimer(null);
      setIsFakeCallOpen(true);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [scheduledTimer]);

  // Walk With Me Countdown
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (walkActive && walkSecondsLeft > 0) {
      timer = setInterval(() => {
        setWalkSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (walkActive && walkSecondsLeft === 0) {
      // Escalated alert: user has not arrived in time
      startEmergencySiren();
      setSirenPlaying(true);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [walkActive, walkSecondsLeft]);

  // Strobe effect
  useEffect(() => {
    let strobeInterval: ReturnType<typeof setInterval> | null = null;
    if (strobeActive) {
      strobeInterval = setInterval(() => {
        const el = document.getElementById('strobe-layer');
        if (el) {
          el.style.opacity = el.style.opacity === '1' ? '0' : '1';
        }
      }, 180);
    }
    return () => {
      if (strobeInterval) clearInterval(strobeInterval);
    };
  }, [strobeActive]);

  const cancelSos = () => {
    setSosCountdown(null);
    setSosActive(false);
    stopEmergencySiren();
    setSirenPlaying(false);
    setStrobeActive(false);
  };

  const triggerSos = () => {
    setSosCountdown(5); // 5 second safety window to cancel false alarms
  };

  const getEmergencyMapsUrl = () => {
    if (!userLocation) return 'https://maps.google.com';
    return `https://maps.google.com/?q=${userLocation.lat},${userLocation.lng}`;
  };

  const getSosMessageText = () => {
    const coordsStr = userLocation
      ? `${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)} (±${userLocation.accuracy}m)`
      : 'Current GPS tracking';
    const mapsLink = getEmergencyMapsUrl();
    return `🚨 EMERGENCY SOS! I need help immediately. My live location is: ${mapsLink} Coordinates: ${coordsStr}. Time: ${new Date().toLocaleTimeString()}. Please call me or send help right away!`;
  };

  const copyLiveShare = () => {
    navigator.clipboard.writeText(getSosMessageText());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(getSosMessageText());
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const shareViaSms = (phone = '') => {
    const text = encodeURIComponent(getSosMessageText());
    window.open(`sms:${phone}?body=${text}`, '_self');
  };

  const handleStartWalk = () => {
    setWalkSecondsLeft(walkDurationMin * 60);
    setWalkActive(true);
  };

  const handleEndWalk = () => {
    setWalkActive(false);
    stopEmergencySiren();
    setSirenPlaying(false);
  };

  // Stealth Calculator Helper
  const handleCalcBtn = (val: string) => {
    if (val === 'C') {
      setCalcDisplay('0');
    } else if (val === '=') {
      try {
        // Safe evaluation
        const sanitized = calcDisplay.replace(/[^0-9+\-*/.]/g, '');
        // eslint-disable-next-line no-eval
        const res = Function(`'use strict'; return (${sanitized})`)();
        setCalcDisplay(String(res));
      } catch {
        setCalcDisplay('Error');
      }
    } else {
      setCalcDisplay((prev) => (prev === '0' ? val : prev + val));
    }
  };

  // Stealth Mode view
  if (stealthMode) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center p-4 font-mono select-none">
        <div className="w-full max-w-xs bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-2xl flex flex-col gap-4">
          <div className="flex items-center justify-between text-neutral-500 text-xs px-1">
            <span>Calculator</span>
            <button
              onClick={() => setStealthMode(false)}
              className="text-neutral-500 hover:text-rose-400 p-1"
              title="Double tap to return to Safely"
            >
              <EyeOff className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-black/80 rounded-xl p-4 text-right text-3xl font-bold tracking-tight text-neutral-100 overflow-x-auto min-h-[60px] flex items-center justify-end">
            {calcDisplay}
          </div>

          <div className="grid grid-cols-4 gap-2 text-base font-semibold">
            {['C', '/', '*', '-'].map((op) => (
              <button
                key={op}
                onClick={() => handleCalcBtn(op)}
                className="h-12 rounded-xl bg-neutral-800 text-amber-400 hover:bg-neutral-750 active:scale-95 transition-transform"
              >
                {op}
              </button>
            ))}
            {['7', '8', '9', '+'].map((val) => (
              <button
                key={val}
                onClick={() => handleCalcBtn(val)}
                className={`h-12 rounded-xl active:scale-95 transition-transform ${
                  val === '+' ? 'bg-neutral-800 text-amber-400' : 'bg-neutral-850 text-white hover:bg-neutral-800'
                }`}
              >
                {val}
              </button>
            ))}
            {['4', '5', '6', '='].map((val) => (
              <button
                key={val}
                onClick={() => {
                  if (val === '=') {
                    // Double tap secret trigger or regular calc
                    handleCalcBtn(val);
                  } else {
                    handleCalcBtn(val);
                  }
                }}
                className={`h-12 rounded-xl active:scale-95 transition-transform ${
                  val === '=' ? 'bg-emerald-600 text-white font-bold row-span-2 flex items-center justify-center' : 'bg-neutral-850 text-white hover:bg-neutral-800'
                }`}
              >
                {val}
              </button>
            ))}
            {['1', '2', '3'].map((val) => (
              <button
                key={val}
                onClick={() => handleCalcBtn(val)}
                className="h-12 rounded-xl bg-neutral-850 text-white hover:bg-neutral-800 active:scale-95 transition-transform"
              >
                {val}
              </button>
            ))}
            <button
              onClick={() => handleCalcBtn('0')}
              className="col-span-2 h-12 rounded-xl bg-neutral-850 text-white hover:bg-neutral-800 active:scale-95 transition-transform"
            >
              0
            </button>
            <button
              onClick={() => handleCalcBtn('.')}
              className="h-12 rounded-xl bg-neutral-850 text-white hover:bg-neutral-800 active:scale-95 transition-transform"
            >
              .
            </button>
          </div>

          <div className="text-center pt-2">
            <button
              onClick={() => setStealthMode(false)}
              className="text-[11px] text-neutral-600 hover:text-neutral-400 cursor-pointer"
            >
              Tap here to exit disguise mode
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans flex flex-col selection:bg-rose-500/30 selection:text-white relative">
      {/* Visual Strobe Layer for Emergency Signaling */}
      <div
        id="strobe-layer"
        className="fixed inset-0 pointer-events-none z-40 bg-red-600/90 mix-blend-screen opacity-0 transition-opacity duration-75"
      />

      {/* SOS Active Urgent Modal Alert */}
      {sosActive && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
          <div className="w-20 h-20 rounded-full bg-red-600 animate-ping absolute opacity-40" />
          <div className="w-20 h-20 rounded-full bg-red-600 flex items-center justify-center mb-6 relative shadow-2xl shadow-red-600">
            <Siren className="w-10 h-10 text-white animate-bounce" />
          </div>

          <h2 className="text-3xl font-extrabold text-white tracking-tight">EMERGENCY SOS BROADCASTING</h2>
          <p className="text-sm text-red-300 mt-2 max-w-md">
            Emergency audio siren is blaring and your live location ping has been compiled for your circle and emergency dispatch.
          </p>

          <div className="bg-neutral-900 border border-red-800/80 rounded-2xl p-4 my-6 max-w-sm w-full text-left text-xs">
            <div className="text-neutral-400 font-medium mb-1">Your Live Coordinates:</div>
            <div className="font-mono text-white text-sm">
              {userLocation ? `${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}` : 'Detecting...'}
            </div>
            <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Accuracy ±{userLocation?.accuracy || 10} meters
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs mb-6">
            <a
              href="tel:911"
              className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-950"
            >
              <Phone className="w-4 h-4" />
              Call 911 / Police
            </a>
            <button
              onClick={shareViaWhatsApp}
              className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp Alert
            </button>
          </div>

          <button
            onClick={cancelSos}
            className="px-6 py-2.5 rounded-xl border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-semibold cursor-pointer"
          >
            I am Safe · Cancel SOS Alarm
          </button>
        </div>
      )}

      {/* SOS False-Alarm Countdown Modal */}
      {sosCountdown !== null && sosCountdown > 0 && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="w-32 h-32 rounded-full border-4 border-red-500 flex items-center justify-center mb-6 animate-pulse bg-red-950/40">
            <span className="font-mono text-6xl font-black text-red-500">{sosCountdown}</span>
          </div>
          <h3 className="text-2xl font-bold text-white">Sending SOS in {sosCountdown}s</h3>
          <p className="text-sm text-neutral-400 mt-1 mb-8 max-w-sm">
            Audible alarm and circle dispatch will trigger automatically. Tap cancel if this was an accidental press.
          </p>
          <button
            onClick={cancelSos}
            className="w-full max-w-xs py-3.5 bg-neutral-200 hover:bg-white text-neutral-950 rounded-xl text-sm font-bold cursor-pointer transition-colors shadow-lg"
          >
            Cancel False Alarm
          </button>
        </div>
      )}

      {/* Top Application Header */}
      <header className="border-b border-neutral-850 bg-neutral-900/90 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-600 flex items-center justify-center shadow-md shadow-rose-950">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-white">Safely</span>
                <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800/60">
                  Girls Circle
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">Personal Safety & Live Location Network</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Stealth Disguise Button */}
            <button
              onClick={() => setStealthMode(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-800 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 text-xs font-medium transition-colors cursor-pointer"
              title="Disguise this screen as a regular calculator"
            >
              <CalcIcon className="w-3.5 h-3.5 text-neutral-400" />
              <span className="hidden sm:inline">Disguise Mode</span>
            </button>

            {/* Quick Siren Toggle Button */}
            <button
              onClick={() => {
                if (sirenPlaying) {
                  stopEmergencySiren();
                  setSirenPlaying(false);
                } else {
                  startEmergencySiren();
                  setSirenPlaying(true);
                }
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-all ${
                sirenPlaying
                  ? 'bg-red-600 text-white border-red-500 animate-pulse shadow-md shadow-red-950'
                  : 'bg-neutral-800/80 hover:bg-neutral-750 text-neutral-200 border-neutral-700/80'
              }`}
            >
              <Siren className="w-3.5 h-3.5" />
              <span>{sirenPlaying ? 'Siren ON' : 'Siren'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-neutral-900 border-b border-neutral-850 px-4">
        <div className="max-w-6xl mx-auto flex items-center gap-1 sm:gap-2 overflow-x-auto py-2 scrollbar-none">
          {[
            { id: 'home', label: 'Safety Radar', icon: MapPin },
            { id: 'fakecall', label: 'Fake Call Escape', icon: PhoneCall },
            { id: 'circle', label: 'Girls Circle', icon: Users, badge: circleMembers.length },
            { id: 'numbers', label: 'Emergency Helplines', icon: Phone },
            { id: 'walk', label: 'Walk With Me', icon: Navigation, activeIndicator: walkActive },
            { id: 'audio', label: 'Deterrent Sounds', icon: Volume2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-neutral-800 text-white shadow-sm ring-1 ring-neutral-700/80'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-850/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-rose-400' : 'text-neutral-500'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded-full bg-neutral-750 text-neutral-300">
                    {tab.badge}
                  </span>
                )}
                {tab.activeIndicator && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {/* TAB 1: SAFETY RADAR & LIVE LOCATION */}
        {activeTab === 'home' && (
          <div className="flex flex-col gap-6">
            {/* Hero SOS Trigger Banner */}
            <div className="bg-gradient-to-br from-red-950/40 via-neutral-900 to-neutral-950 border border-red-900/40 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-red-950/20">
              <div className="flex flex-col gap-2 text-center md:text-left">
                <div className="inline-flex items-center justify-center md:justify-start gap-2 text-xs font-bold text-rose-400 uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  Instant Distress Trigger
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Are you in immediate danger?
                </h2>
                <p className="text-xs sm:text-sm text-neutral-400 max-w-lg">
                  Tap SOS to activate the high-decibel deterrence siren and broadcast your coordinates directly to your circle & emergency contacts.
                </p>
              </div>

              {/* Big Red SOS Button */}
              <button
                onClick={triggerSos}
                className="group relative flex items-center justify-center w-36 h-36 rounded-full bg-gradient-to-b from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 shadow-2xl shadow-red-700/60 active:scale-95 transition-transform cursor-pointer border-4 border-red-400/40"
              >
                <div className="absolute inset-0 rounded-full animate-ping bg-red-600 opacity-20 pointer-events-none" />
                <div className="flex flex-col items-center text-white">
                  <ShieldAlert className="w-10 h-10 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-2xl font-black tracking-wider">SOS</span>
                  <span className="text-[10px] uppercase tracking-widest opacity-80">Hold / Tap</span>
                </div>
              </button>
            </div>

            {/* Live Location Card & Sharing Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Location Details */}
              <div className="lg:col-span-2 bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 sm:p-6 flex flex-col justify-between gap-5">
                <div className="flex items-start justify-between gap-4 border-b border-neutral-850 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-rose-400" />
                      <h3 className="text-base font-bold text-white">Your Real-Time Coordinates</h3>
                    </div>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Continuously monitored via browser Geolocation.
                    </p>
                  </div>
                  <button
                    onClick={refreshLocation}
                    disabled={locLoading}
                    className="text-xs px-3 py-1.5 rounded-lg border border-neutral-800 bg-neutral-950 hover:bg-neutral-850 text-neutral-300 font-medium cursor-pointer transition-colors"
                  >
                    {locLoading ? 'Updating GPS...' : 'Refresh GPS'}
                  </button>
                </div>

                {/* Coordinates & Accuracy Box */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-neutral-950 border border-neutral-850 p-3.5 rounded-xl">
                    <span className="text-[11px] text-neutral-500 font-medium uppercase">Latitude & Longitude</span>
                    <div className="font-mono text-sm font-bold text-neutral-100 mt-1">
                      {userLocation ? `${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}` : 'Searching...'}
                    </div>
                  </div>
                  <div className="bg-neutral-950 border border-neutral-850 p-3.5 rounded-xl">
                    <span className="text-[11px] text-neutral-500 font-medium uppercase">GPS Accuracy</span>
                    <div className="font-mono text-sm font-bold text-emerald-400 mt-1">
                      {userLocation ? `±${userLocation.accuracy} meters` : 'High precision'}
                    </div>
                  </div>
                  <div className="bg-neutral-950 border border-neutral-850 p-3.5 rounded-xl">
                    <span className="text-[11px] text-neutral-500 font-medium uppercase">Last Ping Recorded</span>
                    <div className="font-mono text-sm font-bold text-neutral-100 mt-1">
                      {userLocation?.time || 'Just now'}
                    </div>
                  </div>
                </div>

                {/* Direct Google Maps View & External Link */}
                <div className="bg-neutral-950 border border-neutral-850 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-neutral-300">
                    <span className="font-semibold text-white block">Google Maps Safety Link:</span>
                    <span className="font-mono text-[11px] text-neutral-500 truncate block max-w-sm">
                      {getEmergencyMapsUrl()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={getEmergencyMapsUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-850 hover:bg-neutral-800 text-neutral-200 text-xs font-medium transition-colors border border-neutral-750"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open Maps
                    </a>
                    <button
                      onClick={copyLiveShare}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-850 hover:bg-neutral-800 text-neutral-200 text-xs font-medium transition-colors border border-neutral-750 cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* Quick Share Buttons */}
                <div className="flex flex-col sm:flex-row gap-2.5 pt-2 border-t border-neutral-850">
                  <button
                    onClick={shareViaWhatsApp}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Share Live Location via WhatsApp
                  </button>
                  <button
                    onClick={() => shareViaSms()}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-neutral-800 hover:bg-neutral-750 text-neutral-100 rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-neutral-700/80"
                  >
                    <Share2 className="w-4 h-4 text-neutral-400" />
                    Broadcast SMS Distress Link
                  </button>
                </div>
              </div>

              {/* Right Column: Fast Escape Card & Safety Checklist */}
              <div className="flex flex-col gap-4">
                {/* Instant Fake Call Card */}
                <div className="bg-gradient-to-br from-indigo-950/40 to-neutral-900 border border-indigo-900/50 rounded-2xl p-5 flex flex-col justify-between gap-4">
                  <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
                    <PhoneCall className="w-4 h-4" />
                    Awkward / Unsafe Escape
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">Trigger Simulated Call</h4>
                    <p className="text-xs text-neutral-400 mt-1">
                      Need an instant realistic excuse to walk away from someone? Your phone will ring with speech audio.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setIsFakeCallOpen(true)}
                      className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-950 transition-colors"
                    >
                      <PhoneCall className="w-4 h-4" />
                      Ring Phone Right Now
                    </button>
                    <button
                      onClick={() => {
                        setScheduledTimer(15);
                        setActiveTab('fakecall');
                      }}
                      className="w-full py-2 px-3 bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-neutral-300 rounded-xl text-xs font-medium flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Clock className="w-3.5 h-3.5 text-neutral-500" />
                      Ring in 15 seconds
                    </button>
                  </div>
                </div>

                {/* Quick Deterrent Whistle & Bark */}
                <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 flex flex-col gap-3">
                  <div className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-neutral-400" />
                    Audio Deterrents
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      onClick={() => playHighWhistle()}
                      className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-neutral-200 font-medium flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                      Whistle Blast
                    </button>
                    <button
                      onClick={() => playGuardDogBark()}
                      className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-neutral-200 font-medium flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-rose-400" />
                      Guard Dog Bark
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Circle Overview Banner */}
            <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-950/60 text-rose-400 border border-rose-900/40">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Girls Circle Active ({circleMembers.length} Members)</h4>
                  <p className="text-xs text-neutral-400">All members receive notification when you trigger SOS or start a walk.</p>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('circle')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 cursor-pointer"
              >
                <span>View Full Circle Radar</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: FAKE CALL ESCAPE GENERATOR */}
        {activeTab === 'fakecall' && (
          <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
            <div className="border-b border-neutral-850 pb-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-1">
                <PhoneCall className="w-4 h-4" />
                <span>Discreet Escape Simulator</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">Realistic Incoming Fake Call</h2>
              <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                Triggers an authentic phone ringing screen with customizable audio voice scripts. Answer the call to hear real dialogue and speak along naturally to escape unsafe situations or unwanted company.
              </p>
            </div>

            {/* Active Countdown Notice if Scheduled */}
            {scheduledTimer !== null && (
              <div className="bg-indigo-950/70 border border-indigo-800 rounded-xl p-4 flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-indigo-500 animate-ping" />
                  <span className="text-indigo-200">
                    Incoming call from <strong className="text-white">{selectedPreset.callerName}</strong> scheduled in{' '}
                    <strong className="text-white font-mono text-sm">{scheduledTimer}s</strong>... Pocket your phone!
                  </span>
                </div>
                <button
                  onClick={() => setScheduledTimer(null)}
                  className="px-3 py-1 rounded bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Select Caller Persona */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                Select Caller Profile & Voice Script:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {DEFAULT_PRESETS.map((preset) => {
                  const isSelected = selectedPreset.id === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => setSelectedPreset(preset)}
                      className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                        isSelected
                          ? 'bg-neutral-850 border-indigo-500 shadow-md ring-1 ring-indigo-500/40'
                          : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700 text-neutral-400'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${preset.avatarBg}`}
                        >
                          {preset.callerName.charAt(0)}
                        </div>
                        <div>
                          <div className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-neutral-200'}`}>
                            {preset.callerName}
                          </div>
                          <div className="text-[11px] text-neutral-400">{preset.relationship}</div>
                        </div>
                      </div>

                      <p className="text-[11px] text-neutral-400 line-clamp-3 italic leading-relaxed">
                        "{preset.dialogue}"
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Trigger Options Bar */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-sm font-bold text-white block">Call Trigger Mechanism</span>
                <span className="text-xs text-neutral-400">Ring instantly or delay so you can place your phone on the table.</span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setIsFakeCallOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-950 cursor-pointer flex items-center gap-2"
                >
                  <PhoneCall className="w-4 h-4" />
                  Call Right Now
                </button>
                <button
                  onClick={() => setScheduledTimer(10)}
                  className="px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 text-xs font-medium cursor-pointer"
                >
                  In 10 sec
                </button>
                <button
                  onClick={() => setScheduledTimer(30)}
                  className="px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 text-xs font-medium cursor-pointer"
                >
                  In 30 sec
                </button>
                <button
                  onClick={() => setScheduledTimer(60)}
                  className="px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 text-xs font-medium cursor-pointer"
                >
                  In 1 min
                </button>
              </div>
            </div>

            {/* Custom Caller Creator */}
            <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5 flex flex-col gap-4">
              <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                Or Customize Your Own Caller & Dialogue:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Caller Name (e.g. Inspector Sharma, Uncle David)"
                  value={customCallerName}
                  onChange={(e) => setCustomCallerName(e.target.value)}
                  className="bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <input
                  type="text"
                  placeholder="Caller Speech Script (Spoken aloud by synthesized voice)"
                  value={customDialogue}
                  onChange={(e) => setCustomDialogue(e.target.value)}
                  className="bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button
                disabled={!customCallerName || !customDialogue}
                onClick={() => {
                  const customP: FakeCallPreset = {
                    id: 'custom-' + Date.now(),
                    callerName: customCallerName,
                    relationship: 'Custom Contact',
                    callerNumber: '+1 (555) 000-0000',
                    avatarBg: 'bg-teal-600',
                    dialogue: customDialogue,
                  };
                  setSelectedPreset(customP);
                  setIsFakeCallOpen(true);
                }}
                className="self-start px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-xs font-semibold text-white cursor-pointer transition-colors"
              >
                Test Custom Call
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: GIRLS CIRCLE RADAR & MEMBERS */}
        {activeTab === 'circle' && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-850 pb-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-400 mb-1">
                  <Users className="w-4 h-4" />
                  <span>Trusted Circle Network</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">Girls Safety Circle</h2>
                <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
                  Your trusted circle receives instantaneous alerts if you trigger SOS or if a journey timer lapses.
                </p>
              </div>

              <button
                onClick={() => {
                  shareViaWhatsApp();
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                Ping All Circle Members
              </button>
            </div>

            {/* Add New Circle Member Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newMemberName || !newMemberPhone) return;
                const newMem: CircleMember = {
                  id: Date.now().toString(),
                  name: newMemberName.trim(),
                  relation: newMemberRelation,
                  phone: newMemberPhone.trim(),
                  status: 'safe',
                  lastSeen: 'Just added',
                  battery: 100,
                  locationName: 'Sharing permitted',
                  avatarBg: 'bg-emerald-600',
                };
                setCircleMembers([...circleMembers, newMem]);
                setNewMemberName('');
                setNewMemberPhone('');
              }}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-center"
            >
              <input
                type="text"
                placeholder="Friend / Guardian Name"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                className="w-full sm:flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              />
              <input
                type="tel"
                placeholder="Phone Number (+1...)"
                value={newMemberPhone}
                onChange={(e) => setNewMemberPhone(e.target.value)}
                className="w-full sm:flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              />
              <select
                value={newMemberRelation}
                onChange={(e) => setNewMemberRelation(e.target.value)}
                className="w-full sm:w-auto bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-300 focus:outline-none focus:border-rose-500"
              >
                <option value="Sister">Sister</option>
                <option value="Bestie">Best Friend</option>
                <option value="Roommate">Roommate</option>
                <option value="Parent">Parent</option>
                <option value="Security">Security</option>
              </select>
              <button
                type="submit"
                className="w-full sm:w-auto px-4 py-2 bg-neutral-100 hover:bg-white text-neutral-950 rounded-xl text-xs font-bold cursor-pointer transition-colors inline-flex items-center justify-center gap-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" />
                Add to Circle
              </button>
            </form>

            {/* Circle Members Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {circleMembers.map((member) => (
                <div
                  key={member.id}
                  className="bg-neutral-900/80 border border-neutral-800 hover:border-neutral-750 rounded-2xl p-4 flex flex-col justify-between gap-4 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm ${member.avatarBg}`}
                      >
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{member.name}</span>
                          <span className="text-[10px] text-neutral-400 px-1.5 py-0.5 rounded bg-neutral-800">
                            {member.relation}
                          </span>
                        </div>
                        <div className="text-xs text-neutral-400 font-mono mt-0.5">{member.phone}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => setCircleMembers(circleMembers.filter((m) => m.id !== member.id))}
                      className="text-neutral-600 hover:text-red-400 p-1"
                      title="Remove from Circle"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Status, Location, and Battery */}
                  <div className="bg-neutral-950 border border-neutral-850 rounded-xl p-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-neutral-300 text-[11px] font-medium">{member.locationName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                      <span className="font-mono">{member.battery}%</span>
                      <BatteryCharging className="w-3.5 h-3.5 text-neutral-400" />
                    </div>
                  </div>

                  {/* Quick Action buttons */}
                  <div className="flex items-center gap-2 pt-1 border-t border-neutral-850 text-xs">
                    <a
                      href={`tel:${member.phone}`}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-center font-medium flex items-center justify-center gap-1.5"
                    >
                      <Phone className="w-3 h-3 text-emerald-400" />
                      Call
                    </a>
                    <button
                      onClick={() => shareViaSms(member.phone)}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-center font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <MessageCircle className="w-3 h-3 text-indigo-400" />
                      Send Live GPS
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: EMERGENCY HELPLINES & FAST DIALING */}
        {activeTab === 'numbers' && (
          <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-850 pb-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-400 mb-1">
                  <Phone className="w-4 h-4" />
                  <span>Instant 1-Tap Dialing</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">Emergency Helplines & Numbers</h2>
                <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
                  Tap any number to initiate direct phone call. Works 24/7 without internet connection.
                </p>
              </div>

              {/* Country selector */}
              <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 p-1 rounded-xl text-xs">
                {[
                  { id: 'universal', label: 'Universal (112)' },
                  { id: 'india', label: 'India' },
                  { id: 'usa', label: 'USA / Canada' },
                  { id: 'uk', label: 'UK' },
                ].map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCountry(c.id as typeof selectedCountry)}
                    className={`px-3 py-1 rounded-lg font-medium cursor-pointer transition-colors ${
                      selectedCountry === c.id ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* National / Regional Official Emergency Numbers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Police */}
              <a
                href={
                  selectedCountry === 'india'
                    ? 'tel:100'
                    : selectedCountry === 'uk'
                    ? 'tel:999'
                    : selectedCountry === 'usa'
                    ? 'tel:911'
                    : 'tel:112'
                }
                className="bg-neutral-900 border border-neutral-800 hover:border-red-600/80 rounded-2xl p-5 flex items-center justify-between gap-4 group transition-all"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-red-950/80 text-red-400 border border-red-900/50 flex items-center justify-center font-bold">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-red-400 transition-colors">
                      Police & Emergency Services
                    </h3>
                    <p className="text-xs text-neutral-400">Immediate armed/patrol response</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xl font-bold text-red-400">
                    {selectedCountry === 'india' ? '100 / 112' : selectedCountry === 'uk' ? '999' : '911'}
                  </span>
                  <span className="block text-[10px] text-neutral-500 uppercase">Tap to Call</span>
                </div>
              </a>

              {/* National Women Safety Line */}
              <a
                href={selectedCountry === 'india' ? 'tel:1091' : 'tel:18007997233'}
                className="bg-neutral-900 border border-neutral-800 hover:border-rose-500/80 rounded-2xl p-5 flex items-center justify-between gap-4 group transition-all"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-rose-950/80 text-rose-400 border border-rose-900/50 flex items-center justify-center font-bold">
                    <Heart className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-rose-400 transition-colors">
                      Women Safety Helpline
                    </h3>
                    <p className="text-xs text-neutral-400">Trained female operators 24/7</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xl font-bold text-rose-400">
                    {selectedCountry === 'india' ? '1091' : '1-800-799-SAFE'}
                  </span>
                  <span className="block text-[10px] text-neutral-500 uppercase">Tap to Call</span>
                </div>
              </a>

              {/* Domestic Abuse & Harassment Crisis Line */}
              <a
                href={selectedCountry === 'india' ? 'tel:181' : 'tel:18007997233'}
                className="bg-neutral-900 border border-neutral-800 hover:border-amber-500/80 rounded-2xl p-5 flex items-center justify-between gap-4 group transition-all"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-amber-950/80 text-amber-400 border border-amber-900/50 flex items-center justify-center font-bold">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors">
                      Domestic Violence Support
                    </h3>
                    <p className="text-xs text-neutral-400">Legal, shelter & psychological aid</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xl font-bold text-amber-400">
                    {selectedCountry === 'india' ? '181' : '1-800-799'}
                  </span>
                  <span className="block text-[10px] text-neutral-500 uppercase">Tap to Call</span>
                </div>
              </a>

              {/* Medical Ambulance */}
              <a
                href={selectedCountry === 'india' ? 'tel:108' : selectedCountry === 'uk' ? 'tel:999' : 'tel:911'}
                className="bg-neutral-900 border border-neutral-800 hover:border-emerald-500/80 rounded-2xl p-5 flex items-center justify-between gap-4 group transition-all"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-emerald-950/80 text-emerald-400 border border-emerald-900/50 flex items-center justify-center font-bold">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors">
                      Ambulance & Paramedic
                    </h3>
                    <p className="text-xs text-neutral-400">Medical emergency response</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xl font-bold text-emerald-400">
                    {selectedCountry === 'india' ? '108' : selectedCountry === 'uk' ? '999' : '911'}
                  </span>
                  <span className="block text-[10px] text-neutral-500 uppercase">Tap to Call</span>
                </div>
              </a>
            </div>

            {/* Personal Fast Dial Contacts */}
            <div className="flex flex-col gap-3 mt-4">
              <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                Personal Emergency Speed Dials:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {emergencyContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="bg-neutral-950 border border-neutral-850 rounded-xl p-4 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-bold text-white text-xs">{contact.name}</div>
                      <div className="text-[11px] text-neutral-500 font-mono">{contact.phone}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${contact.phone}`}
                        className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white"
                        title="Call"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => shareViaSms(contact.phone)}
                        className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 cursor-pointer"
                        title="Send SMS"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: WALK WITH ME (JOURNEY SAFETY TIMER) */}
        {activeTab === 'walk' && (
          <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">
            <div className="border-b border-neutral-850 pb-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-400 mb-1">
                <Navigation className="w-4 h-4" />
                <span>Virtual Safety Escort</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">"Walk With Me" Journey Watch</h2>
              <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
                Traveling alone at night, taking a taxi, or walking back to your dorm? Start a safety timer. If you don't check in safely when the timer hits zero, an automatic alarm and circle broadcast will trigger.
              </p>
            </div>

            {!walkActive ? (
              /* Setup Screen */
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-neutral-300">Where are you heading?</label>
                  <input
                    type="text"
                    value={walkDestination}
                    onChange={(e) => setWalkDestination(e.target.value)}
                    placeholder="e.g. Walking from Metro to Apartment, Uber ride home"
                    className="bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-neutral-300">Estimated Duration</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[5, 10, 15, 30].map((mins) => (
                      <button
                        key={mins}
                        onClick={() => setWalkDurationMin(mins)}
                        className={`py-2 rounded-xl text-xs font-semibold cursor-pointer border ${
                          walkDurationMin === mins
                            ? 'bg-rose-950/80 border-rose-600 text-rose-300'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                      >
                        {mins} Mins
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleStartWalk}
                  className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-rose-950 cursor-pointer flex items-center justify-center gap-2 transition-colors mt-2"
                >
                  <Navigation className="w-4 h-4" />
                  Start Journey Guard
                </button>
              </div>
            ) : (
              /* Active Walk Guard Screen */
              <div className="bg-neutral-900 border border-rose-900/50 rounded-2xl p-6 flex flex-col items-center text-center gap-6">
                <div className="flex items-center gap-2 text-xs font-bold text-rose-400 uppercase tracking-wider">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  Active Safety Journey Watch
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white">{walkDestination}</h3>
                  <p className="text-xs text-neutral-400 mt-1">Check in when you reach safely to disarm the timer.</p>
                </div>

                {/* Big Timer */}
                <div className="w-48 h-48 rounded-full border-4 border-rose-600/60 bg-neutral-950 flex flex-col items-center justify-center shadow-xl">
                  <span className="font-mono text-4xl font-extrabold text-white">
                    {Math.floor(walkSecondsLeft / 60)
                      .toString()
                      .padStart(2, '0')}
                    :
                    {(walkSecondsLeft % 60).toString().padStart(2, '0')}
                  </span>
                  <span className="text-[11px] text-neutral-500 uppercase tracking-widest mt-1">Remaining</span>
                </div>

                {/* Action: I have arrived safely */}
                <div className="flex flex-col gap-2.5 w-full max-w-sm">
                  <button
                    onClick={handleEndWalk}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-950 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    I've Arrived Safely · End Guard
                  </button>
                  <button
                    onClick={() => setWalkSecondsLeft((prev) => prev + 5 * 60)}
                    className="w-full py-2 bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white rounded-xl text-xs font-medium cursor-pointer"
                  >
                    + Add 5 More Minutes
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: AUDIO DETERRENTS & SIRENS */}
        {activeTab === 'audio' && (
          <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
            <div className="border-b border-neutral-850 pb-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-400 mb-1">
                <Volume2 className="w-4 h-4" />
                <span>Audible Defense Tools</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">Emergency Sound Deterrents</h2>
              <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
                Play loud synthesized deterrents to startle suspicious persons, alert nearby pedestrians, or simulate authority presence.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Emergency Police Siren */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-col justify-between gap-4">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-red-950 text-red-400 flex items-center justify-center mb-3">
                    <Siren className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white">Emergency Siren</h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    Continuous dual-tone loud distress siren to draw immediate crowd attention.
                  </p>
                </div>

                <button
                  onClick={() => {
                    if (sirenPlaying) {
                      stopEmergencySiren();
                      setSirenPlaying(false);
                    } else {
                      startEmergencySiren();
                      setSirenPlaying(true);
                    }
                  }}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                    sirenPlaying ? 'bg-red-600 text-white animate-pulse' : 'bg-neutral-100 hover:bg-white text-neutral-950'
                  }`}
                >
                  {sirenPlaying ? 'Stop Siren' : 'Sound Siren'}
                </button>
              </div>

              {/* Piercing Whistle */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-col justify-between gap-4">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-amber-950 text-amber-400 flex items-center justify-center mb-3">
                    <Volume2 className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white">Police Whistle</h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    Sharp, high-frequency whistle burst that cuts through city noise.
                  </p>
                </div>

                <button
                  onClick={() => playHighWhistle()}
                  className="w-full py-2.5 rounded-xl bg-neutral-100 hover:bg-white text-neutral-950 text-xs font-bold cursor-pointer transition-colors"
                >
                  Blast Whistle
                </button>
              </div>

              {/* Guard Dog Barking */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-col justify-between gap-4">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-rose-950 text-rose-400 flex items-center justify-center mb-3">
                    <Radio className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white">Guard Dog Sound</h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    Aggressive multi-burst barking to discourage someone following you closely.
                  </p>
                </div>

                <button
                  onClick={() => playGuardDogBark()}
                  className="w-full py-2.5 rounded-xl bg-neutral-100 hover:bg-white text-neutral-950 text-xs font-bold cursor-pointer transition-colors"
                >
                  Play Dog Bark
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Persistent Bottom Emergency Floating Bar for Mobile */}
      <aside aria-label="Quick Action Floating Bar" className="sticky bottom-0 z-30 bg-neutral-950/95 border-t border-neutral-850 p-3 sm:hidden backdrop-blur-md">
        <div className="flex items-center gap-2">
          <button
            onClick={triggerSos}
            className="flex-1 py-3 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-red-950 cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4" />
            Instant SOS
          </button>
          <button
            onClick={() => setIsFakeCallOpen(true)}
            className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-950 cursor-pointer"
          >
            <PhoneCall className="w-4 h-4" />
            Fake Call
          </button>
        </div>
      </aside>

      {/* Fake Call Overlay Modal */}
      <FakeCallModal
        isOpen={isFakeCallOpen}
        preset={selectedPreset}
        onClose={() => setIsFakeCallOpen(false)}
      />
    </div>
  );
}
