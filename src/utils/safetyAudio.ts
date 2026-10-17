// Audio and speech synthesis utilities for Safely women's safety app

let audioCtx: AudioContext | null = null;
let sirenOsc1: OscillatorNode | null = null;
let sirenOsc2: OscillatorNode | null = null;
let sirenGain: GainNode | null = null;
let sirenInterval: ReturnType<typeof setInterval> | null = null;

let ringtoneInterval: ReturnType<typeof setInterval> | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Plays a loud, piercing emergency siren sound using dual oscillating wave frequencies.
 */
export function startEmergencySiren(): void {
  stopAllAudio();
  const ctx = getAudioContext();

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.85, ctx.currentTime);
  gain.connect(ctx.destination);
  sirenGain = gain;

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();

  osc1.type = 'sawtooth';
  osc2.type = 'square';

  osc1.connect(gain);
  osc2.connect(gain);

  osc1.start();
  osc2.start();

  sirenOsc1 = osc1;
  sirenOsc2 = osc2;

  let high = false;
  sirenInterval = setInterval(() => {
    if (!sirenOsc1 || !sirenOsc2 || !audioCtx) return;
    const now = audioCtx.currentTime;
    const freq1 = high ? 750 : 1250;
    const freq2 = high ? 760 : 1270;
    sirenOsc1.frequency.linearRampToValueAtTime(freq1, now + 0.3);
    sirenOsc2.frequency.linearRampToValueAtTime(freq2, now + 0.3);
    high = !high;
  }, 350);
}

/**
 * Stops the emergency siren.
 */
export function stopEmergencySiren(): void {
  if (sirenInterval) {
    clearInterval(sirenInterval);
    sirenInterval = null;
  }
  if (sirenOsc1) {
    try {
      sirenOsc1.stop();
      sirenOsc1.disconnect();
    } catch {}
    sirenOsc1 = null;
  }
  if (sirenOsc2) {
    try {
      sirenOsc2.stop();
      sirenOsc2.disconnect();
    } catch {}
    sirenOsc2 = null;
  }
  if (sirenGain) {
    try {
      sirenGain.disconnect();
    } catch {}
    sirenGain = null;
  }
}

/**
 * Plays a realistic phone ringtone cycle (repeating rings with pauses).
 */
export function startPhoneRingtone(): void {
  stopAllAudio();
  const ctx = getAudioContext();

  const playSingleRingCycle = () => {
    if (!ctx) return;
    const now = ctx.currentTime;

    const ringGain = ctx.createGain();
    ringGain.connect(ctx.destination);

    // Modern Marimba / Bell chime harmonic chord
    const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      noteGain.gain.setValueAtTime(0, now + idx * 0.08);
      noteGain.gain.linearRampToValueAtTime(0.3, now + idx * 0.08 + 0.04);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.5);

      osc.connect(noteGain);
      noteGain.connect(ringGain);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.6);
    });

    // Second chime burst after 0.8s
    setTimeout(() => {
      if (!ringtoneInterval) return;
      const t = ctx.currentTime;
      [783.99, 987.77, 1046.5, 1318.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + idx * 0.08);

        noteGain.gain.setValueAtTime(0, t + idx * 0.08);
        noteGain.gain.linearRampToValueAtTime(0.35, t + idx * 0.08 + 0.04);
        noteGain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.5);

        osc.connect(noteGain);
        noteGain.connect(ringGain);

        osc.start(t + idx * 0.08);
        osc.stop(t + idx * 0.08 + 0.6);
      });
    }, 700);
  };

  playSingleRingCycle();
  ringtoneInterval = setInterval(playSingleRingCycle, 2800);
}

/**
 * Stops phone ringtone.
 */
export function stopPhoneRingtone(): void {
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
}

/**
 * Plays a loud piercing emergency whistle burst.
 */
export function playHighWhistle(): void {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(2600, now);
  osc.frequency.exponentialRampToValueAtTime(3200, now + 0.2);
  osc.frequency.exponentialRampToValueAtTime(2800, now + 0.5);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.9, now + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.65);
}

/**
 * Plays protective guard dog barking burst to deter approachers.
 */
export function playGuardDogBark(): void {
  const ctx = getAudioContext();
  const playBark = (timeOffset: number) => {
    const t = ctx.currentTime + timeOffset;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.18);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(450, t);
    filter.Q.setValueAtTime(3.0, t);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.85, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.22);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.24);
  };

  playBark(0);
  playBark(0.28);
  playBark(0.65);
  playBark(0.95);
}

/**
 * Speaks realistic caller voice dialogue using SpeechSynthesis.
 */
export function speakCallerDialogue(
  dialogue: string,
  callerName: string,
  onEnd?: () => void
): void {
  if (!('speechSynthesis' in window)) {
    if (onEnd) onEnd();
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(dialogue);
  utterance.rate = 1.0;
  utterance.pitch = callerName.toLowerCase().includes('dad') || callerName.toLowerCase().includes('brother') || callerName.toLowerCase().includes('police') ? 0.85 : 1.15;
  utterance.volume = 1.0;

  // Pick voice if available (prioritize Indian English/Hindi if on an Indian context)
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    const isMale =
      callerName.toLowerCase().includes('papa') ||
      callerName.toLowerCase().includes('dad') ||
      callerName.toLowerCase().includes('brother') ||
      callerName.toLowerCase().includes('bhai') ||
      callerName.toLowerCase().includes('police') ||
      callerName.toLowerCase().includes('inspector');

    // First look for en-IN or hi-IN voices
    const indianVoices = voices.filter(
      (v) =>
        v.lang === 'en-IN' ||
        v.lang === 'hi-IN' ||
        v.name.toLowerCase().includes('india') ||
        v.name.toLowerCase().includes('neerja') ||
        v.name.toLowerCase().includes('rishi') ||
        v.name.toLowerCase().includes('prabhat')
    );

    let matched: SpeechSynthesisVoice | undefined;
    if (indianVoices.length > 0) {
      matched = indianVoices.find((v) => {
        const name = v.name.toLowerCase();
        if (isMale) return name.includes('male') || name.includes('rishi') || name.includes('prabhat');
        return name.includes('female') || name.includes('neerja') || name.includes('heera');
      }) || indianVoices[0];
    }

    if (!matched) {
      matched = voices.find((v) => {
        const name = v.name.toLowerCase();
        if (isMale) return name.includes('male') || name.includes('david') || name.includes('george') || name.includes('guy');
        return name.includes('female') || name.includes('samantha') || name.includes('zira') || name.includes('victoria');
      });
    }

    if (matched) utterance.voice = matched;
  }

  if (onEnd) {
    utterance.onend = () => {
      onEnd();
    };
  }

  window.speechSynthesis.speak(utterance);
}

/**
 * Stop any active caller speech.
 */
export function stopCallerSpeech(): void {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Clean up all audio nodes.
 */
export function stopAllAudio(): void {
  stopEmergencySiren();
  stopPhoneRingtone();
  stopCallerSpeech();
}
