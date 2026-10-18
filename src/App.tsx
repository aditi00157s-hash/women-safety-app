import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  ShieldAlert,
  Phone,
  PhoneCall,
  MapPin,
  Users,
  Volume2,
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
  EyeOff,
  BatteryCharging,
  Zap,
  ExternalLink,
  MessageCircle,
  Siren,
  Bell,
  ChevronRight,
  Calculator as CalcIcon,
  Train,
  Volume1,
  Smartphone,
  Download,
  Activity,
  Touchpad,
  Sparkles,
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

const INDIAN_PRESETS: FakeCallPreset[] = [
  {
    id: 'papa',
    callerName: 'Papa ❤️',
    relationship: 'Family',
    callerNumber: '+91 98101 23456',
    avatarBg: 'bg-blue-600',
    dialogue:
      "Beta, main main gate ke samne car mein khada hoon, white Dzire hai hazard lights on hai. Jaldi bahar aao, main chal kar tumhari taraf aa raha hoon.",
  },
  {
    id: 'police',
    callerName: 'Inspector Sharma (Police PCR)',
    relationship: 'Police Control Room',
    callerNumber: '112-PCR-DELHI',
    avatarBg: 'bg-indigo-700',
    dialogue:
      "Namaste madam, Inspector Sharma from PCR patrol. We received your safety ping. Hamari police PCR van aapke chowk par 1 minute mein pahunch rahi hai. Busy road par hi rahiye.",
  },
  {
    id: 'mummy',
    callerName: 'Mummy 🌸',
    relationship: 'Family',
    callerNumber: '+91 98712 34567',
    avatarBg: 'bg-rose-600',
    dialogue:
      "Beta kahan pahunchi? Raat ho gayi hai. Papa aur bhaiya auto stand tak aa gaye hain tumhe pick karne. Phone ka speaker on rakho, main line par hi hoon.",
  },
  {
    id: 'sister',
    callerName: 'Pooja Di (Sister)',
    relationship: 'Sister',
    callerNumber: '+91 99990 12345',
    avatarBg: 'bg-purple-600',
    dialogue:
      "Choti kahan hai tu? Main Metro Station Gate No. 2 ke cafe ke bahar khadi hoon! Haath hila rahi hoon dekh, jaldi aaja sab log wait kar rahe hain.",
  },
  {
    id: 'bhaiya',
    callerName: 'Bhaiya (Elder Brother)',
    relationship: 'Family',
    callerNumber: '+91 98112 78901',
    avatarBg: 'bg-emerald-700',
    dialogue:
      "Arre sunn, main bike leke bus stop ke paas hi khada hoon. Do minute mein pahunch raha hoon, kisi se baat mat karna bas seedhe aaja.",
  },
  {
    id: 'cab',
    callerName: 'Ramesh - Ola Cab',
    relationship: 'Cab Driver',
    callerNumber: '+91 97180 54321',
    avatarBg: 'bg-amber-600',
    dialogue:
      "Madam namaste, aapki Ola cab white Swift main gate par lagayi hai. Indicator on kiya hai maine, aap aaram se baithiye.",
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'circle' | 'fakecall' | 'numbers' | 'walk' | 'audio' | 'volume' | 'install'>('home');
  const [stealthMode, setStealthMode] = useState(false);
  const [pocketMode, setPocketMode] = useState(false); // True black screen with 3-tap anywhere trigger

  // --- DEVICE OS DETECTION ---
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  // --- LOCATION & SOS STATE ---
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy: number; time: string } | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const [sosCountdown, setSosCountdown] = useState<number | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [sirenPlaying, setSirenPlaying] = useState(false);
  const [strobeActive, setStrobeActive] = useState(false);

  // --- VOLUME DECREASE / SHAKE TRIGGER STATE ---
  const [volumeShortcutEnabled, setVolumeShortcutEnabled] = useState(true);
  const [shakeTriggerEnabled, setShakeTriggerEnabled] = useState(true);
  const [volumeTapCount, setVolumeTapCount] = useState(0);
  const [volumeAction, setVolumeAction] = useState<'both' | 'fake_call' | 'call_me_sms'>('both');
  const [volumeContactId, setVolumeContactId] = useState('1'); // Papa by default
  const [volumeTriggerAlert, setVolumeTriggerAlert] = useState<string | null>(null);
  const tapTimesRef = useRef<number[]>([]);
  const shakeTimesRef = useRef<number[]>([]);
  const lastShakeTimeRef = useRef<number>(0);

  // --- FAKE CALL STATE ---
  const [isFakeCallOpen, setIsFakeCallOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<FakeCallPreset>(INDIAN_PRESETS[0]);
  const [scheduledTimer, setScheduledTimer] = useState<number | null>(null);
  const [customCallerName, setCustomCallerName] = useState('');
  const [customDialogue, setCustomDialogue] = useState('');

  // --- CIRCLE MEMBERS ---
  const [circleMembers, setCircleMembers] = useState<CircleMember[]>([
    {
      id: '1',
      name: 'Mummy',
      relation: 'Parent',
      phone: '+91 98712 34567',
      status: 'safe',
      lastSeen: 'Active now',
      battery: 94,
      locationName: 'Home - Civil Lines',
      avatarBg: 'bg-rose-600',
    },
    {
      id: '2',
      name: 'Papa',
      relation: 'Parent',
      phone: '+91 98101 23456',
      status: 'safe',
      lastSeen: '5 mins ago',
      battery: 82,
      locationName: 'Home - Office Road',
      avatarBg: 'bg-blue-600',
    },
    {
      id: '3',
      name: 'Pooja Di',
      relation: 'Sister',
      phone: '+91 99990 12345',
      status: 'moving',
      lastSeen: 'Just now',
      battery: 78,
      locationName: 'Walking from Rajiv Chowk Metro',
      avatarBg: 'bg-purple-600',
    },
    {
      id: '4',
      name: 'Ananya (PG Roommate)',
      relation: 'Roommate',
      phone: '+91 98111 87654',
      status: 'safe',
      lastSeen: '12 mins ago',
      battery: 89,
      locationName: 'At Girls Hostel / PG',
      avatarBg: 'bg-emerald-600',
    },
    {
      id: '5',
      name: 'Hostel / Society Guard',
      relation: 'Security Desk',
      phone: '+91 98999 55555',
      status: 'safe',
      lastSeen: 'Main Gate Booth',
      battery: 100,
      locationName: 'Gate No. 1 Watchpost',
      avatarBg: 'bg-amber-600',
    },
  ]);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberRelation, setNewMemberRelation] = useState('Sister');

  // --- EMERGENCY CONTACTS ---
  const [emergencyContacts] = useState<EmergencyContact[]>([
    { id: '1', name: 'Papa ❤️', phone: '+919810123456', relation: 'Father', isPrimary: true },
    { id: '2', name: 'Mummy 🌸', phone: '+919871234567', relation: 'Mother', isPrimary: true },
    { id: '3', name: 'Pooja Di', phone: '+919999012345', relation: 'Sister', isPrimary: false },
    { id: '4', name: 'National Emergency 112', phone: '112', relation: 'Police ERSS', isPrimary: true },
  ]);

  const [selectedState, setSelectedState] = useState<'all_india' | 'delhi' | 'mumbai' | 'up' | 'bengaluru'>('all_india');

  // --- WALK WITH ME (INDIAN JOURNEY WATCH) ---
  const [walkActive, setWalkActive] = useState(false);
  const [walkDestination, setWalkDestination] = useState('Metro Station to PG / Society Gate');
  const [walkDurationMin, setWalkDurationMin] = useState(15);
  const [walkSecondsLeft, setWalkSecondsLeft] = useState(15 * 60);

  // --- STEALTH CALCULATOR ---
  const [calcDisplay, setCalcDisplay] = useState('0');

  // Detect OS on mount
  useEffect(() => {
    const ua = navigator.userAgent || '';
    const isApple = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isDroid = /Android/.test(ua);
    setIsIOS(isApple);
    setIsAndroid(isDroid);

    const isApp = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(isApp);
  }, []);

  // Fetch real geolocation
  const refreshLocation = () => {
    if (!('geolocation' in navigator)) return;
    setLocLoading(true);

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
      () => {
        setUserLocation({
          lat: 28.6139,
          lng: 77.2090,
          accuracy: 12,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
        setLocLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  useEffect(() => {
    refreshLocation();
  }, []);

  const getEmergencyMapsUrl = () => {
    if (!userLocation) return 'https://maps.google.com';
    return `https://maps.google.com/?q=${userLocation.lat},${userLocation.lng}`;
  };

  const getSosMessageText = () => {
    const coordsStr = userLocation
      ? `${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}`
      : 'Current GPS tracking';
    const mapsLink = getEmergencyMapsUrl();
    return `🚨 आपातकालीन SOS / EMERGENCY ALERT: Mujhe turant madad chahiye! Meri live location hai: ${mapsLink} (Coordinates: ${coordsStr}, Time: ${new Date().toLocaleTimeString()}). Kripya turant police (112 / 1091) ko inform karein ya mujhe call karein!`;
  };

  const getCallMeMessageText = () => {
    const mapsLink = getEmergencyMapsUrl();
    const contact = emergencyContacts.find((c) => c.id === volumeContactId) || emergencyContacts[0];
    return `🚨 CALL ME URGENTLY! (कॉल करो तुरंत): Hi ${contact.name}, I am in an uncomfortable / unsafe place and cannot talk right now. Please CALL ME REPEATEDLY immediately so I have an excuse to step away! My live GPS location: ${mapsLink} (Time: ${new Date().toLocaleTimeString()})`;
  };

  // --- TRIGGER DISPATCH FOR VOLUME 3X / SHAKE / POCKET TAP ---
  const triggerVolumeDecreaseAction = () => {
    const targetContact = emergencyContacts.find((c) => c.id === volumeContactId) || emergencyContacts[0];

    // Android haptic vibration
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([200, 100, 200, 100, 400]);
      } catch {}
    }

    // Native Web Notification
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('🚨 Safely: Emergency Trigger Activated!', {
          body: `Emergency 'Call Me' Alert dispatched to ${targetContact.name}. Live GPS shared.`,
          icon: '/icon.svg',
        });
      } catch {}
    }

    setVolumeTriggerAlert(`Shortcut Triggered! Rescue action dispatched for ${targetContact.name}.`);
    setTimeout(() => setVolumeTriggerAlert(null), 5000);

    if (volumeAction === 'fake_call' || volumeAction === 'both') {
      setSelectedPreset(INDIAN_PRESETS[0]);
      setIsFakeCallOpen(true);
    }

    if (volumeAction === 'call_me_sms' || volumeAction === 'both') {
      const text = encodeURIComponent(getCallMeMessageText());
      window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    }
  };

  // Hardware Volume Down Event Listener (Native Android & Desktop 'v' key)
  useEffect(() => {
    if (!volumeShortcutEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'AudioVolumeDown' ||
        e.code === 'AudioVolumeDown' ||
        e.key === 'VolumeDown' ||
        e.key.toLowerCase() === 'v'
      ) {
        const now = Date.now();
        tapTimesRef.current = tapTimesRef.current.filter((t) => now - t < 2500);
        tapTimesRef.current.push(now);

        const currentCount = tapTimesRef.current.length;
        setVolumeTapCount(currentCount);

        if (currentCount >= 3) {
          tapTimesRef.current = [];
          setVolumeTapCount(0);
          triggerVolumeDecreaseAction();
        } else {
          setTimeout(() => {
            if (tapTimesRef.current.length === 0) setVolumeTapCount(0);
          }, 2600);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [volumeShortcutEnabled, volumeAction, volumeContactId, userLocation]);

  // Motion Shake Sensor (Works on both Android and iOS accelerometer)
  useEffect(() => {
    if (!shakeTriggerEnabled) return;

    const handleMotion = (event: DeviceMotionEvent) => {
      const acc = event.accelerationIncludingGravity || event.acceleration;
      if (!acc || acc.x === null || acc.y === null || acc.z === null) return;

      const totalAcc = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
      const now = Date.now();

      // Detect strong shake burst (threshold > 24 m/s^2)
      if (totalAcc > 24 && now - lastShakeTimeRef.current > 300) {
        lastShakeTimeRef.current = now;
        shakeTimesRef.current = shakeTimesRef.current.filter((t) => now - t < 2500);
        shakeTimesRef.current.push(now);

        if (shakeTimesRef.current.length >= 3) {
          shakeTimesRef.current = [];
          triggerVolumeDecreaseAction();
        }
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [shakeTriggerEnabled, volumeAction, volumeContactId, userLocation]);

  // Request iOS DeviceMotion permission (required on iOS 13+ Safari)
  const enableIOSMotionPermission = async () => {
    const DeviceMotionEventWithPerm = window.DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
    if (typeof DeviceMotionEventWithPerm?.requestPermission === 'function') {
      try {
        const response = await DeviceMotionEventWithPerm.requestPermission();
        if (response === 'granted') {
          setVolumeTriggerAlert('Motion sensor enabled for iOS Shake-to-SOS!');
          setTimeout(() => setVolumeTriggerAlert(null), 3000);
        }
      } catch {
        // User cancelled or not supported
      }
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        new Notification('Safely Suraksha Enabled', {
          body: 'Emergency alerts ready for both Android and iPhone.',
        });
      }
    }
  };

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
    setSosCountdown(5);
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

  const shareToNcwWhatsApp = () => {
    const text = encodeURIComponent(getSosMessageText());
    window.open(`https://api.whatsapp.com/send?phone=917827170170&text=${text}`, '_blank');
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

  const handleCalcBtn = (val: string) => {
    if (val === 'C') {
      setCalcDisplay('0');
    } else if (val === '=') {
      try {
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

  // --- POCKET MODE (True OLED Black Screen with 3-Tap Anywhere Sensor for iPhone & Android) ---
  if (pocketMode) {
    return (
      <div
        onClick={() => {
          const now = Date.now();
          tapTimesRef.current = tapTimesRef.current.filter((t) => now - t < 2500);
          tapTimesRef.current.push(now);
          if (tapTimesRef.current.length >= 3) {
            tapTimesRef.current = [];
            setPocketMode(false);
            triggerVolumeDecreaseAction();
          }
        }}
        className="fixed inset-0 z-50 bg-black flex flex-col justify-between p-6 select-none cursor-pointer"
      >
        <div className="flex items-center justify-between text-neutral-800 text-xs">
          <span>OLED Pocket Guard Active</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setPocketMode(false);
            }}
            className="text-neutral-700 hover:text-neutral-400 p-2 text-xs"
          >
            Exit Pocket Mode
          </button>
        </div>

        <div className="text-center text-neutral-850 text-xs">
          <p>Screen is dimmed black for pocket carrying.</p>
          <p className="mt-1">Tap screen 3 times rapidly anywhere to trigger rescue action.</p>
        </div>

        <div className="text-center text-neutral-850 text-[10px]">
          Safely Suraksha · Android & iOS Pocket Sensor
        </div>
      </div>
    );
  }

  // --- STEALTH CALCULATOR MODE ---
  if (stealthMode) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center p-4 font-mono select-none">
        <div className="w-full max-w-xs bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-2xl flex flex-col gap-4">
          <div className="flex items-center justify-between text-neutral-500 text-xs px-1">
            <span>Calculator</span>
            <button
              onClick={() => setStealthMode(false)}
              className="text-neutral-500 hover:text-rose-400 p-1 cursor-pointer"
              title="Exit disguise mode"
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
                onClick={() => handleCalcBtn(val)}
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
              Tap here to return to Safely India
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

      {/* Floating Alert Notification */}
      {volumeTriggerAlert && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-red-600 to-rose-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-red-300 text-xs font-bold animate-in fade-in slide-in-from-top-4 duration-200">
          <Volume1 className="w-5 h-5 animate-pulse" />
          <span>{volumeTriggerAlert}</span>
        </div>
      )}

      {/* Active SOS Modal */}
      {sosActive && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
          <div className="w-20 h-20 rounded-full bg-red-600 animate-ping absolute opacity-40" />
          <div className="w-20 h-20 rounded-full bg-red-600 flex items-center justify-center mb-5 relative shadow-2xl shadow-red-600">
            <Siren className="w-10 h-10 text-white animate-bounce" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            आपातकालीन SOS सक्रिय / SOS BROADCASTING
          </h2>
          <p className="text-xs sm:text-sm text-red-300 mt-1 max-w-md">
            Emergency Siren is sounding. Live GPS tracking link prepared for India Police (112), Women Helpline (1091), and your family WhatsApp.
          </p>

          <div className="bg-neutral-900 border border-red-800/80 rounded-2xl p-4 my-5 max-w-sm w-full text-left text-xs">
            <div className="text-neutral-400 font-medium mb-1">Your Exact GPS Location (India):</div>
            <div className="font-mono text-white text-sm font-bold">
              {userLocation ? `${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}` : 'Tracking...'}
            </div>
            <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Accuracy ±{userLocation?.accuracy || 10}m · Google Maps Ready
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 w-full max-w-sm mb-5">
            <a
              href="tel:112"
              className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-950"
            >
              <Phone className="w-4 h-4" />
              Call Police (112)
            </a>
            <a
              href="tel:1091"
              className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2"
            >
              <Heart className="w-4 h-4" />
              Women Helpline (1091)
            </a>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 w-full max-w-sm mb-6">
            <button
              onClick={shareViaWhatsApp}
              className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp Family Alert
            </button>
            <button
              onClick={shareToNcwWhatsApp}
              className="flex-1 py-3 px-4 bg-teal-700 hover:bg-teal-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              <Shield className="w-4 h-4" />
              NCW WhatsApp SOS
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

      {/* SOS False Alarm 5-second countdown */}
      {sosCountdown !== null && sosCountdown > 0 && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="w-32 h-32 rounded-full border-4 border-red-500 flex items-center justify-center mb-6 animate-pulse bg-red-950/40">
            <span className="font-mono text-6xl font-black text-red-500">{sosCountdown}</span>
          </div>
          <h3 className="text-2xl font-bold text-white">Sending SOS in {sosCountdown}s</h3>
          <p className="text-xs text-neutral-400 mt-1 mb-8 max-w-sm">
            Audible siren and family dispatch will start. Tap cancel if this was an accidental touch.
          </p>
          <button
            onClick={cancelSos}
            className="w-full max-w-xs py-3.5 bg-neutral-200 hover:bg-white text-neutral-950 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-lg"
          >
            Cancel False Alarm
          </button>
        </div>
      )}

      {/* Top Header */}
      <header className="border-b border-neutral-850 bg-neutral-900/90 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-600 flex items-center justify-center shadow-md shadow-rose-950">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-white">Safely</span>
                <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-1.5 py-0.5 rounded bg-orange-950/90 text-orange-300 border border-orange-800/60 flex items-center gap-1">
                  <span>🇮🇳 India · Android & iOS</span>
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">112 / 1091 SOS · Live GPS · Volume & Shake Triggers</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Install on Android & iOS button */}
            <button
              onClick={() => setActiveTab('install')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-800 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 text-xs font-medium cursor-pointer"
              title="Install app on Android or iPhone"
            >
              <Smartphone className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">Install App</span>
            </button>

            {/* Pocket Guard Sensor */}
            <button
              onClick={() => setPocketMode(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-800 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 text-xs font-medium cursor-pointer"
              title="OLED dim screen with 3-tap anywhere sensor"
            >
              <Touchpad className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Pocket Guard</span>
            </button>

            {/* Stealth Mode */}
            <button
              onClick={() => setStealthMode(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-800 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 text-xs font-medium cursor-pointer"
              title="Disguise as calculator"
            >
              <CalcIcon className="w-3.5 h-3.5 text-neutral-400" />
              <span className="hidden sm:inline">Disguise</span>
            </button>

            {/* Siren Toggle */}
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

      {/* Cross-Platform Hardware Triggers Status Bar */}
      <div className="bg-gradient-to-r from-neutral-900 via-rose-950/40 to-neutral-900 border-b border-rose-900/30 px-4 py-2">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
            <span className="text-neutral-300">
              <strong>Android & iPhone Shortcuts Ready:</strong> Volume Down 3x · Shake Phone 3x · Pocket Tap.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('volume')}
              className="px-2.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium text-[11px] cursor-pointer"
            >
              Configure Actions
            </button>
            <button
              onClick={triggerVolumeDecreaseAction}
              className="px-2.5 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] cursor-pointer"
            >
              Test Trigger
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-neutral-900 border-b border-neutral-850 px-4">
        <div className="max-w-6xl mx-auto flex items-center gap-1 sm:gap-2 overflow-x-auto py-2 scrollbar-none">
          {[
            { id: 'home', label: 'Safety Radar', icon: MapPin },
            { id: 'volume', label: 'Volume & Shake Triggers', icon: Volume1, highlight: true },
            { id: 'install', label: 'Android & iOS App Guide', icon: Smartphone },
            { id: 'fakecall', label: 'Fake Call (Papa / Police)', icon: PhoneCall },
            { id: 'circle', label: 'Suraksha Circle', icon: Users, badge: circleMembers.length },
            { id: 'numbers', label: 'India Helplines (112 / 1091)', icon: Phone },
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
                    : tab.highlight
                    ? 'text-rose-300 hover:text-white hover:bg-neutral-850/60'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-850/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-rose-400' : tab.highlight ? 'text-rose-400' : 'text-neutral-500'}`} />
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

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {/* TAB: INSTALL ON ANDROID & IOS GUIDE */}
        {activeTab === 'install' && (
          <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
            <div className="border-b border-neutral-850 pb-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-400 mb-1">
                <Smartphone className="w-4 h-4" />
                <span>Install on Mobile (Android & Apple iOS)</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                How to Install Safely on Android & iPhone
              </h2>
              <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                Safely is built as an installable Progressive Web App (PWA) with full standalone support, offline emergency directory, and hardware triggers.
              </p>
            </div>

            {/* Platform Guides Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Android Card */}
              <div className={`p-6 rounded-2xl border flex flex-col justify-between gap-5 ${isAndroid ? 'bg-neutral-850 border-emerald-500/80 ring-1 ring-emerald-500/30' : 'bg-neutral-900 border-neutral-800'}`}>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4" />
                      For Android Phones (Samsung, Pixel, OnePlus, Xiaomi)
                    </span>
                    {isAndroid && (
                      <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full font-bold">
                        Your Device Detected
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-white">Install via Google Chrome</h3>
                  <ol className="text-xs text-neutral-350 space-y-2.5 mt-3 list-decimal list-inside leading-relaxed">
                    <li>Tap the <strong>three dots menu (⋮)</strong> at top right corner of Chrome.</li>
                    <li>Tap <strong>"Install app"</strong> or <strong>"Add to Home Screen"</strong>.</li>
                    <li>Confirm <strong>"Install"</strong>. Safely will appear directly on your home screen with its own icon.</li>
                    <li><strong>Physical Volume Trigger:</strong> Android directly captures triple-clicking the physical Volume Down button!</li>
                  </ol>
                </div>

                <div className="bg-neutral-950 border border-neutral-850 p-3 rounded-xl text-xs text-emerald-400 flex items-center gap-2 font-mono">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>Hardware Volume 3x Supported on Android</span>
                </div>
              </div>

              {/* iOS Card */}
              <div className={`p-6 rounded-2xl border flex flex-col justify-between gap-5 ${isIOS ? 'bg-neutral-850 border-rose-500/80 ring-1 ring-rose-500/30' : 'bg-neutral-900 border-neutral-800'}`}>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4" />
                      For Apple iPhones (iOS 14+)
                    </span>
                    {isIOS && (
                      <span className="text-[10px] bg-rose-950 text-rose-300 border border-rose-800 px-2 py-0.5 rounded-full font-bold">
                        Your iPhone Detected
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-white">Install via Safari</h3>
                  <ol className="text-xs text-neutral-350 space-y-2.5 mt-3 list-decimal list-inside leading-relaxed">
                    <li>Open this link in <strong>Safari browser</strong> on your iPhone.</li>
                    <li>Tap the <strong>Share button (square with arrow up ⎋)</strong> at bottom.</li>
                    <li>Scroll down and tap <strong>"Add to Home Screen" (⊞)</strong>.</li>
                    <li>Tap <strong>Add</strong>. Safely opens edge-to-edge without browser URL bars!</li>
                    <li><strong>iPhone Triggers:</strong> Use <strong>Shake-to-SOS</strong>, <strong>Pocket Tap</strong>, or link Apple <strong>Back Tap</strong> (Settings → Accessibility → Touch → Back Tap).</li>
                  </ol>
                </div>

                {isIOS && (
                  <button
                    onClick={enableIOSMotionPermission}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center justify-center gap-2"
                  >
                    <Activity className="w-4 h-4" />
                    Enable iPhone Shake Sensor Permission
                  </button>
                )}
              </div>
            </div>

            {/* iPhone Back Tap Special Tip */}
            <div className="bg-gradient-to-r from-neutral-900 via-indigo-950/40 to-neutral-900 border border-indigo-900/50 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0">
                  <Touchpad className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">iPhone "Back Tap" Secret Hardware Trigger</h4>
                  <p className="text-xs text-neutral-400">
                    On iPhone 8 & newer, you can tap the physical back of your phone 2 or 3 times to open Safely! Set it up in: <em>Settings → Accessibility → Touch → Back Tap</em>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: VOLUME & SHAKE TRIGGERS */}
        {activeTab === 'volume' && (
          <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
            <div className="border-b border-neutral-850 pb-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-400 mb-1">
                <Volume1 className="w-4 h-4" />
                <span>Android & iOS Hardware Triggers (शॉर्टकट)</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Volume Down & Shake-to-SOS Triggers
              </h2>
              <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                Discreet pocket triggers for both <strong>Android</strong> (Volume Down button 3x) and <strong>iPhone</strong> (Shake 3x or Pocket Screen Tap) to immediately send a "Call Me!" alert.
              </p>
            </div>

            {/* Interactive Hardware Tester */}
            <div className="bg-gradient-to-br from-rose-950/50 via-neutral-900 to-neutral-950 border border-rose-900/60 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
              <div className="flex flex-col gap-3 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 text-xs font-bold text-rose-400 uppercase tracking-wider">
                  <span className={`w-2.5 h-2.5 rounded-full ${volumeShortcutEnabled ? 'bg-emerald-400 animate-ping' : 'bg-neutral-600'}`} />
                  <span>Hardware Listener Active on Android & iOS</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white">
                  3x Rapid Trigger (Volume Down, Shake, or Tap)
                </h3>
                <p className="text-xs text-neutral-300 max-w-md">
                  Keep your phone inside your jeans pocket or bag. Triple-clicking volume down or shaking the phone 3 times triggers your safety action without opening the screen.
                </p>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setPocketMode(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 text-xs font-medium border border-emerald-800 cursor-pointer"
                  >
                    <Touchpad className="w-3.5 h-3.5" />
                    <span>Launch OLED Pocket Screen (3-Tap Anywhere)</span>
                  </button>

                  {isIOS && (
                    <button
                      onClick={enableIOSMotionPermission}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-850 hover:bg-neutral-800 text-neutral-200 text-xs font-medium border border-neutral-700 cursor-pointer"
                    >
                      <Activity className="w-3.5 h-3.5 text-rose-400" />
                      <span>Grant iPhone Motion Sensor</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Interactive Button */}
              <div className="flex flex-col items-center gap-3 shrink-0">
                <button
                  onClick={() => {
                    const now = Date.now();
                    tapTimesRef.current = tapTimesRef.current.filter((t) => now - t < 2500);
                    tapTimesRef.current.push(now);
                    const currentCount = tapTimesRef.current.length;
                    setVolumeTapCount(currentCount);

                    if (currentCount >= 3) {
                      tapTimesRef.current = [];
                      setVolumeTapCount(0);
                      triggerVolumeDecreaseAction();
                    } else {
                      setTimeout(() => {
                        if (tapTimesRef.current.length === 0) setVolumeTapCount(0);
                      }, 2600);
                    }
                  }}
                  className="w-32 h-32 rounded-2xl bg-neutral-900 border-2 border-rose-500/80 hover:border-rose-400 hover:bg-neutral-850 flex flex-col items-center justify-center gap-1 shadow-2xl active:scale-95 transition-transform cursor-pointer group"
                >
                  <Volume1 className="w-8 h-8 text-rose-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-white">Click 3 Times</span>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    {volumeTapCount > 0 ? `${volumeTapCount} / 3 clicks` : 'Volume / Test'}
                  </span>
                </button>
                <span className="text-[11px] text-neutral-500">Tap 3x rapidly to test trigger</span>
              </div>
            </div>

            {/* Settings Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Selected Contact */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-300 uppercase tracking-wider">
                  <Users className="w-4 h-4 text-rose-400" />
                  <span>1. Contact receiving "Call Me" alert:</span>
                </div>

                <div className="flex flex-col gap-2.5">
                  {emergencyContacts.map((contact) => (
                    <label
                      key={contact.id}
                      className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                        volumeContactId === contact.id
                          ? 'bg-neutral-850 border-rose-500/80 ring-1 ring-rose-500/30'
                          : 'bg-neutral-950 border-neutral-850 hover:border-neutral-750 text-neutral-400'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="volumeContact"
                          checked={volumeContactId === contact.id}
                          onChange={() => setVolumeContactId(contact.id)}
                          className="accent-rose-500"
                        />
                        <div>
                          <div className="text-xs font-bold text-white">{contact.name}</div>
                          <div className="text-[11px] text-neutral-500 font-mono">{contact.phone}</div>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">
                        {contact.relation}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Action Selection */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-300 uppercase tracking-wider">
                  <Zap className="w-4 h-4 text-rose-400" />
                  <span>2. Trigger Action:</span>
                </div>

                <div className="flex flex-col gap-2.5 text-xs">
                  {[
                    {
                      id: 'both',
                      title: 'Ring My Phone & Send "Call Me" Alert (Recommended)',
                      desc: 'Rings your phone immediately from Papa/Police so you can answer, AND prepares a WhatsApp/SMS alert with live GPS to your contact.',
                    },
                    {
                      id: 'fake_call',
                      title: 'Discreet Fake Call Escape Only',
                      desc: 'Makes your phone ring aloud with realistic dialogue from Papa or Police so you can walk away.',
                    },
                    {
                      id: 'call_me_sms',
                      title: 'Silent "Call Me Urgently" Dispatch',
                      desc: 'Discreetly sends: "CALL ME IMMEDIATELY! I am in trouble at [Live GPS Location]" without ringing your phone.',
                    },
                  ].map((act) => (
                    <label
                      key={act.id}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                        volumeAction === act.id
                          ? 'bg-neutral-850 border-rose-500/80 ring-1 ring-rose-500/30'
                          : 'bg-neutral-950 border-neutral-850 hover:border-neutral-750 text-neutral-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="volumeAction"
                        checked={volumeAction === act.id}
                        onChange={() => setVolumeAction(act.id as typeof volumeAction)}
                        className="accent-rose-500 mt-0.5"
                      />
                      <div>
                        <div className="font-bold text-white mb-0.5">{act.title}</div>
                        <div className="text-[11px] text-neutral-400 leading-relaxed">{act.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Generated Call Me Message Preview */}
            <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5 flex flex-col gap-2.5">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                Preview of Dispatched Message:
              </span>
              <div className="bg-neutral-950 border border-neutral-850 rounded-xl p-3.5 text-xs font-mono text-emerald-300 leading-relaxed">
                {getCallMeMessageText()}
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: SAFETY RADAR & LIVE LOCATION */}
        {activeTab === 'home' && (
          <div className="flex flex-col gap-6">
            {/* Hero SOS Banner */}
            <div className="bg-gradient-to-br from-red-950/40 via-neutral-900 to-neutral-950 border border-red-900/40 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-red-950/20">
              <div className="flex flex-col gap-2 text-center md:text-left">
                <div className="inline-flex items-center justify-center md:justify-start gap-2 text-xs font-bold text-rose-400 uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  India 24/7 Distress SOS (आपातकालीन बटन)
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Are you in trouble or feeling unsafe?
                </h2>
                <p className="text-xs sm:text-sm text-neutral-400 max-w-lg">
                  Tap SOS to sound the loud deterrent siren and send your live Google Maps coordinates via WhatsApp and SMS to family and 112 ERSS police.
                </p>
                <div className="text-[11px] text-rose-300 flex items-center gap-1.5 mt-1">
                  <Volume1 className="w-3.5 h-3.5" />
                  <span>Pro-tip: Click phone's Volume Down 3x or Shake phone 3x to trigger automatic rescue call.</span>
                </div>
              </div>

              {/* Big Red SOS Button */}
              <button
                onClick={triggerSos}
                className="group relative flex items-center justify-center w-36 h-36 rounded-full bg-gradient-to-b from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 shadow-2xl shadow-red-700/60 active:scale-95 transition-transform cursor-pointer border-4 border-red-400/40 shrink-0"
              >
                <div className="absolute inset-0 rounded-full animate-ping bg-red-600 opacity-20 pointer-events-none" />
                <div className="flex flex-col items-center text-white">
                  <ShieldAlert className="w-10 h-10 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-2xl font-black tracking-wider">SOS</span>
                  <span className="text-[10px] uppercase tracking-widest opacity-80">आपातकालीन</span>
                </div>
              </button>
            </div>

            {/* Quick WhatsApp Dispatch Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={shareViaWhatsApp}
                className="bg-emerald-950/60 border border-emerald-800/80 hover:bg-emerald-900/60 p-4 rounded-2xl flex items-center gap-3 transition-colors text-left cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shrink-0">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">WhatsApp Family Alert</span>
                  <span className="text-[11px] text-emerald-300">Live GPS + Coordinates</span>
                </div>
              </button>

              <button
                onClick={shareToNcwWhatsApp}
                className="bg-teal-950/60 border border-teal-800/80 hover:bg-teal-900/60 p-4 rounded-2xl flex items-center gap-3 transition-colors text-left cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">NCW WhatsApp SOS</span>
                  <span className="text-[11px] text-teal-300">National Commission (7827170170)</span>
                </div>
              </button>

              <a
                href="tel:112"
                className="bg-red-950/60 border border-red-800/80 hover:bg-red-900/60 p-4 rounded-2xl flex items-center gap-3 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Call 112 (All-India ERSS)</span>
                  <span className="text-[11px] text-red-300">Police, Ambulance, Fire</span>
                </div>
              </a>
            </div>

            {/* Live Location Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 sm:p-6 flex flex-col justify-between gap-5">
                <div className="flex items-start justify-between gap-4 border-b border-neutral-850 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-rose-400" />
                      <h3 className="text-base font-bold text-white">Live GPS Location Sharing</h3>
                    </div>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Coordinates are accurate for streets, metro stations, and autos across India.
                    </p>
                  </div>
                  <button
                    onClick={refreshLocation}
                    disabled={locLoading}
                    className="text-xs px-3 py-1.5 rounded-lg border border-neutral-800 bg-neutral-950 hover:bg-neutral-850 text-neutral-300 font-medium cursor-pointer"
                  >
                    {locLoading ? 'Updating GPS...' : 'Refresh GPS'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-neutral-950 border border-neutral-850 p-3.5 rounded-xl">
                    <span className="text-[11px] text-neutral-500 font-medium uppercase">Latitude & Longitude</span>
                    <div className="font-mono text-sm font-bold text-neutral-100 mt-1">
                      {userLocation ? `${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}` : 'Detecting...'}
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

                {/* Google Maps link */}
                <div className="bg-neutral-950 border border-neutral-850 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-neutral-300">
                    <span className="font-semibold text-white block">Google Maps SOS Link:</span>
                    <span className="font-mono text-[11px] text-neutral-500 truncate block max-w-sm">
                      {getEmergencyMapsUrl()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={getEmergencyMapsUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-850 hover:bg-neutral-800 text-neutral-200 text-xs font-medium border border-neutral-750"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open Maps
                    </a>
                    <button
                      onClick={copyLiveShare}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-850 hover:bg-neutral-800 text-neutral-200 text-xs font-medium border border-neutral-750 cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Fast Escape Card */}
              <div className="flex flex-col gap-4">
                <div className="bg-gradient-to-br from-indigo-950/40 to-neutral-900 border border-indigo-900/50 rounded-2xl p-5 flex flex-col justify-between gap-4">
                  <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
                    <PhoneCall className="w-4 h-4" />
                    Fake Audio Call (फर्जी कॉल)
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">Escape Suspicious Company</h4>
                    <p className="text-xs text-neutral-400 mt-1">
                      Suspicious person following or cab driver acting weird? Make your phone ring from "Papa" or "Police" with speech audio.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setIsFakeCallOpen(true)}
                      className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-950"
                    >
                      <PhoneCall className="w-4 h-4" />
                      Ring Phone from Papa ❤️
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPreset(INDIAN_PRESETS[1]);
                        setIsFakeCallOpen(true);
                      }}
                      className="w-full py-2 px-3 bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-neutral-300 rounded-xl text-xs font-medium flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Shield className="w-3.5 h-3.5 text-indigo-400" />
                      Ring from Police Inspector (PCR)
                    </button>
                  </div>
                </div>

                {/* Deterrent sound buttons */}
                <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 flex flex-col gap-3">
                  <div className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-neutral-400" />
                    Instant Audio Deterrents
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      onClick={() => playHighWhistle()}
                      className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-neutral-200 font-medium flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                      Police Whistle
                    </button>
                    <button
                      onClick={() => playGuardDogBark()}
                      className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-neutral-200 font-medium flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-rose-400" />
                      Guard Dog Bark
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FAKE CALL ESCAPE GENERATOR */}
        {activeTab === 'fakecall' && (
          <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
            <div className="border-b border-neutral-850 pb-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-1">
                <PhoneCall className="w-4 h-4" />
                <span>Discreet Escape Simulator (फर्जी कॉल)</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">Realistic Incoming Fake Call (India)</h2>
              <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                Rings your phone with authentic Indian English / Hindi voice scripts. Works seamlessly on Android and iPhone with native mobile call screen.
              </p>
            </div>

            {/* Scheduled timer alert */}
            {scheduledTimer !== null && (
              <div className="bg-indigo-950/70 border border-indigo-800 rounded-xl p-4 flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-indigo-500 animate-ping" />
                  <span className="text-indigo-200">
                    Incoming call from <strong className="text-white">{selectedPreset.callerName}</strong> in{' '}
                    <strong className="text-white font-mono text-sm">{scheduledTimer}s</strong>... Put phone on table or pocket!
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

            {/* Indian Caller Presets */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                Select Indian Caller Profile & Dialogue:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {INDIAN_PRESETS.map((preset) => {
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

                      <p className="text-[11px] text-neutral-300 line-clamp-3 italic leading-relaxed">
                        "{preset.dialogue}"
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Call Trigger Buttons */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-sm font-bold text-white block">Trigger Timing</span>
                <span className="text-xs text-neutral-400">Ring right now or set a delay so you can act surprised.</span>
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

            {/* Custom Caller */}
            <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5 flex flex-col gap-4">
              <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                Custom Hindi / Hinglish Voice Dialogue:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Caller Name (e.g. Chachu, RWA Uncle, Hostel Warden)"
                  value={customCallerName}
                  onChange={(e) => setCustomCallerName(e.target.value)}
                  className="bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <input
                  type="text"
                  placeholder="Dialogue script (e.g. Beta main gate par khada hoon, jaldi aao)"
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
                    callerNumber: '+91 98110 00000',
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

        {/* TAB 3: SURAKSHA CIRCLE */}
        {activeTab === 'circle' && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-850 pb-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-400 mb-1">
                  <Users className="w-4 h-4" />
                  <span>Suraksha Network (सुरक्षा चक्र)</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">Girls Suraksha Circle</h2>
                <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
                  Your family, sisters, and hostel friends who will receive instantaneous WhatsApp and SMS alerts.
                </p>
              </div>

              <button
                onClick={shareViaWhatsApp}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer shadow-md shadow-emerald-950"
              >
                <MessageCircle className="w-4 h-4" />
                Broadcast to Family WhatsApp Group
              </button>
            </div>

            {/* Add Member Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newMemberName || !newMemberPhone) return;
                const formattedPhone = newMemberPhone.startsWith('+91')
                  ? newMemberPhone
                  : `+91 ${newMemberPhone}`;
                const newMem: CircleMember = {
                  id: Date.now().toString(),
                  name: newMemberName.trim(),
                  relation: newMemberRelation,
                  phone: formattedPhone.trim(),
                  status: 'safe',
                  lastSeen: 'Just added',
                  battery: 100,
                  locationName: 'Sharing enabled',
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
                placeholder="Name (e.g. Choti Behen, Mummy, Ananya)"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                className="w-full sm:flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              />
              <input
                type="tel"
                placeholder="Mobile (+91 98...)"
                value={newMemberPhone}
                onChange={(e) => setNewMemberPhone(e.target.value)}
                className="w-full sm:flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              />
              <select
                value={newMemberRelation}
                onChange={(e) => setNewMemberRelation(e.target.value)}
                className="w-full sm:w-auto bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-300 focus:outline-none focus:border-rose-500"
              >
                <option value="Sister">Sister (बहन)</option>
                <option value="Parent">Parent (माता-पिता)</option>
                <option value="Roommate">PG Roommate (सहेली)</option>
                <option value="Brother">Brother (भाई)</option>
                <option value="Security">Hostel / Society Guard</option>
              </select>
              <button
                type="submit"
                className="w-full sm:w-auto px-4 py-2 bg-neutral-100 hover:bg-white text-neutral-950 rounded-xl text-xs font-bold cursor-pointer transition-colors inline-flex items-center justify-center gap-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" />
                Add to Circle
              </button>
            </form>

            {/* Circle Member Cards */}
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
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

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

                  <div className="flex items-center gap-2 pt-1 border-t border-neutral-850 text-xs">
                    <a
                      href={`tel:${member.phone}`}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-center font-medium flex items-center justify-center gap-1.5"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      Call
                    </a>
                    <button
                      onClick={() => shareViaSms(member.phone)}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-center font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-indigo-400" />
                      Send Live GPS
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: OFFICIAL INDIA EMERGENCY HELPLINES */}
        {activeTab === 'numbers' && (
          <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-850 pb-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-400 mb-1">
                  <Phone className="w-4 h-4" />
                  <span>Government of India Official Helplines</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">India Emergency Directory</h2>
                <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
                  1-Tap Direct dialing on both Android & iOS. Works 24/7 without internet or balance on all telecom networks.
                </p>
              </div>

              {/* State Filter */}
              <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 p-1 rounded-xl text-xs">
                {[
                  { id: 'all_india', label: 'All India' },
                  { id: 'delhi', label: 'Delhi NCR' },
                  { id: 'mumbai', label: 'Mumbai' },
                  { id: 'up', label: 'UP (1090 WPL)' },
                  { id: 'bengaluru', label: 'Bengaluru' },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setSelectedState(st.id as typeof selectedState)}
                    className={`px-3 py-1 rounded-lg font-medium cursor-pointer transition-colors ${
                      selectedState === st.id ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Helpline Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <a
                href="tel:112"
                className="bg-neutral-900 border border-neutral-800 hover:border-red-600/80 rounded-2xl p-5 flex items-center justify-between gap-4 group transition-all"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-red-950/80 text-red-400 border border-red-900/50 flex items-center justify-center font-bold">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-red-400 transition-colors">
                      112 (National ERSS Police)
                    </h3>
                    <p className="text-xs text-neutral-400">All-in-one Police, Fire & Medical</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-2xl font-black text-red-400">112</span>
                  <span className="block text-[10px] text-neutral-500 uppercase">24/7 Free</span>
                </div>
              </a>

              <a
                href="tel:1091"
                className="bg-neutral-900 border border-neutral-800 hover:border-rose-500/80 rounded-2xl p-5 flex items-center justify-between gap-4 group transition-all"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-rose-950/80 text-rose-400 border border-rose-900/50 flex items-center justify-center font-bold">
                    <Heart className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-rose-400 transition-colors">
                      Women Helpline (महिला हेल्पलाइन)
                    </h3>
                    <p className="text-xs text-neutral-400">Dedicated female police officers</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-2xl font-black text-rose-400">1091</span>
                  <span className="block text-[10px] text-neutral-500 uppercase">24/7 Free</span>
                </div>
              </a>

              <a
                href="tel:1090"
                className="bg-neutral-900 border border-neutral-800 hover:border-indigo-500/80 rounded-2xl p-5 flex items-center justify-between gap-4 group transition-all"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-indigo-950/80 text-indigo-400 border border-indigo-900/50 flex items-center justify-center font-bold">
                    <Radio className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors">
                      Women Power Line (1090 WPL)
                    </h3>
                    <p className="text-xs text-neutral-400">Stalking, cyber harassment & calls</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-2xl font-black text-indigo-400">1090</span>
                  <span className="block text-[10px] text-neutral-500 uppercase">Confidential</span>
                </div>
              </a>

              <a
                href="tel:181"
                className="bg-neutral-900 border border-neutral-800 hover:border-amber-500/80 rounded-2xl p-5 flex items-center justify-between gap-4 group transition-all"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-amber-950/80 text-amber-400 border border-amber-900/50 flex items-center justify-center font-bold">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors">
                      181 (Ministry of WCD)
                    </h3>
                    <p className="text-xs text-neutral-400">Domestic abuse, shelter & legal aid</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-2xl font-black text-amber-400">181</span>
                  <span className="block text-[10px] text-neutral-500 uppercase">Toll Free</span>
                </div>
              </a>

              <a
                href="tel:139"
                className="bg-neutral-900 border border-neutral-800 hover:border-cyan-500/80 rounded-2xl p-5 flex items-center justify-between gap-4 group transition-all"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-cyan-950/80 text-cyan-400 border border-cyan-900/50 flex items-center justify-center font-bold">
                    <Train className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-cyan-400 transition-colors">
                      139 (Rail Madad & RPF Security)
                    </h3>
                    <p className="text-xs text-neutral-400">Safety on trains & railway platforms</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-2xl font-black text-cyan-400">139</span>
                  <span className="block text-[10px] text-neutral-500 uppercase">Railways</span>
                </div>
              </a>

              <a
                href="tel:1930"
                className="bg-neutral-900 border border-neutral-800 hover:border-emerald-500/80 rounded-2xl p-5 flex items-center justify-between gap-4 group transition-all"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-emerald-950/80 text-emerald-400 border border-emerald-900/50 flex items-center justify-center font-bold">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors">
                      1930 (National Cyber Crime)
                    </h3>
                    <p className="text-xs text-neutral-400">Online blackmail, morphing & fraud</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-2xl font-black text-emerald-400">1930</span>
                  <span className="block text-[10px] text-neutral-500 uppercase">Cyber Police</span>
                </div>
              </a>
            </div>
          </div>
        )}

        {/* TAB 5: WALK WITH ME */}
        {activeTab === 'walk' && (
          <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">
            <div className="border-b border-neutral-850 pb-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-400 mb-1">
                <Navigation className="w-4 h-4" />
                <span>Virtual Journey Watch (सफ़र सुरक्षा)</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">"Walk With Me" Journey Guard</h2>
              <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
                Taking an auto, late-night cab, or walking from the Metro station? Set an estimated arrival timer. If you don't check in safely before the timer ends, an alarm and WhatsApp circle ping will trigger automatically.
              </p>
            </div>

            {!walkActive ? (
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-neutral-300">Where are you traveling?</label>
                  <input
                    type="text"
                    value={walkDestination}
                    onChange={(e) => setWalkDestination(e.target.value)}
                    placeholder="e.g. Metro station to society gate, Ola/Uber ride home"
                    className="bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                  <div className="flex items-center gap-2 flex-wrap mt-1">
                    {[
                      'Metro Station to PG / Hostel',
                      'Late Night Auto / Cab Ride',
                      'Coaching / College to Home',
                      'Market to Apartment Gate',
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        onClick={() => setWalkDestination(preset)}
                        className="text-[10px] px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-850 hover:border-neutral-750 text-neutral-400 hover:text-white cursor-pointer"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-neutral-300">Estimated Travel Time</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[5, 10, 15, 25].map((mins) => (
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
                  className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-rose-950 cursor-pointer flex items-center justify-center gap-2 mt-2"
                >
                  <Navigation className="w-4 h-4" />
                  Start Journey Guard
                </button>
              </div>
            ) : (
              <div className="bg-neutral-900 border border-rose-900/50 rounded-2xl p-6 flex flex-col items-center text-center gap-6">
                <div className="flex items-center gap-2 text-xs font-bold text-rose-400 uppercase tracking-wider">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  Active Safety Journey Guard
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white">{walkDestination}</h3>
                  <p className="text-xs text-neutral-400 mt-1">Tap safe arrival when you reach your destination.</p>
                </div>

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

                <div className="flex flex-col gap-2.5 w-full max-w-sm">
                  <button
                    onClick={handleEndWalk}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-950 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    I've Arrived Safely (पहुंच गई)
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

        {/* TAB 6: AUDIO DETERRENTS */}
        {activeTab === 'audio' && (
          <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
            <div className="border-b border-neutral-850 pb-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-400 mb-1">
                <Volume2 className="w-4 h-4" />
                <span>Audible Defense Tools (ध्वनि सायरन)</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">Emergency Sound Deterrents</h2>
              <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
                Play synthesized loud sounds to immediately startle suspects or alert crowds on dark roads.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-col justify-between gap-4">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-red-950 text-red-400 flex items-center justify-center mb-3">
                    <Siren className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white">Emergency Police Siren</h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    Continuous loud dual-frequency siren to draw immediate public attention.
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

              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-col justify-between gap-4">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-amber-950 text-amber-400 flex items-center justify-center mb-3">
                    <Volume2 className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white">Police Whistle (सीटी)</h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    Sharp, high-frequency whistle burst modeled after traffic & railway police whistles.
                  </p>
                </div>

                <button
                  onClick={() => playHighWhistle()}
                  className="w-full py-2.5 rounded-xl bg-neutral-100 hover:bg-white text-neutral-950 text-xs font-bold cursor-pointer transition-colors"
                >
                  Blast Whistle
                </button>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-col justify-between gap-4">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-rose-950 text-rose-400 flex items-center justify-center mb-3">
                    <Radio className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white">Guard Dog Barking</h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    Aggressive protective barking pattern to deter suspicious persons on isolated lanes.
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

      {/* Floating Bottom Bar for Mobile */}
      <aside aria-label="Mobile Emergency Floating Bar" className="sticky bottom-0 z-30 bg-neutral-950/95 border-t border-neutral-850 p-3 sm:hidden backdrop-blur-md">
        <div className="flex items-center gap-2">
          <button
            onClick={triggerSos}
            className="flex-1 py-3 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-red-950 cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4" />
            112 SOS
          </button>
          <button
            onClick={triggerVolumeDecreaseAction}
            className="flex-1 py-3 bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-rose-950 cursor-pointer"
          >
            <Volume1 className="w-4 h-4" />
            Vol 3x Alert
          </button>
        </div>
      </aside>

      {/* Fake Call Overlay */}
      <FakeCallModal
        isOpen={isFakeCallOpen}
        preset={selectedPreset}
        onClose={() => setIsFakeCallOpen(false)}
      />
    </div>
  );
}
