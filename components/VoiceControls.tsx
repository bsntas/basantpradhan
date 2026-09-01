'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface VoiceControlsProps {
  text: string;
  pageNumber?: number;
}

type Gender  = 'female' | 'male';
type Texture = 'smooth' | 'natural' | 'expressive';

const TEXTURE_PRESETS: Record<Texture, { rate: number; pitch: number }> = {
  smooth:     { rate: 0.85, pitch: 0.9 },
  natural:    { rate: 1.0,  pitch: 1.0 },
  expressive: { rate: 1.1,  pitch: 1.2 },
};

const FEMALE_HINTS = [
  'female','woman','girl','zira','hazel','cortana','samantha','victoria',
  'fiona','moira','veena','allison','ava','karen','serena','kate','susan',
  'neerja','heera','raveena','kyoko','ting-ting','sin-ji','mei-jia','yuna',
];
const MALE_HINTS = [
  'male','man','david','mark','george','daniel','alex','tom','lee','fred',
  'jorge','luca','damien','aaron','albert','bruce','carlos','cepstral','james',
];

// Matches voices that can pronounce Devanagari (Nepali / Hindi)
const DEVANAGARI_LANG_CODES = ['ne', 'ne-np', 'ne-in', 'hi', 'hi-in'];
function isDevanagariVoice(voice: SpeechSynthesisVoice): boolean {
  return DEVANAGARI_LANG_CODES.some(code => voice.lang.toLowerCase().startsWith(code));
}

function hasDevanagari(s: string): boolean {
  return /[ऀ-ॿ]/.test(s);
}

// Strip content that TTS reads poorly: URLs, phone numbers, ISBNs, special symbols
function cleanForSpeech(s: string): string {
  return s
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/www\.\S+/gi, '')
    .replace(/\S+@\S+\.\S+/g, '')
    .replace(/[+]?\d[\d\s\-]{7,}/g, '')
    .replace(/ISBN\s*:?\s*[\d\-]+/gi, '')
    .replace(/[|।॥]/g, ' ')
    .replace(/[^\S\n]+/g, ' ')
    .trim();
}

function guessGender(voice: SpeechSynthesisVoice): Gender | null {
  const n = voice.name.toLowerCase();
  if (FEMALE_HINTS.some(h => n.includes(h))) return 'female';
  if (MALE_HINTS.some(h => n.includes(h)))   return 'male';
  return null;
}

function voiceQuality(voice: SpeechSynthesisVoice): number {
  const n = voice.name.toLowerCase();
  if (n.includes('premium') || n.includes('enhanced') || n.includes('neural')) return 3;
  if (n.includes('google') || n.includes('microsoft') || n.includes('apple')) return 2;
  return 1;
}

export default function VoiceControls({ text, pageNumber }: VoiceControlsProps) {
  const [voices, setVoices]               = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [gender, setGender]               = useState<Gender>('female');
  const [texture, setTexture]             = useState<Texture>('natural');
  const [volume, setVolume]               = useState(1.0);
  const [rate, setRate]                   = useState(1.0);
  const [pitch, setPitch]                 = useState(1.0);
  const [isPlaying, setIsPlaying]         = useState(false);
  const [isPaused, setIsPaused]           = useState(false);
  const [isOpen, setIsOpen]               = useState(false);
  const [showAdvanced, setShowAdvanced]   = useState(false);
  const [hasStaticAudio, setHasStaticAudio] = useState(false);
  const [usingStaticAudio, setUsingStaticAudio] = useState(false);

  const utteranceRef    = useRef<SpeechSynthesisUtterance | null>(null);
  const keepAliveRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef        = useRef<HTMLAudioElement | null>(null);
  const isStaticRef     = useRef(false);

  const clearKeepAlive = useCallback(() => {
    if (keepAliveRef.current) { clearInterval(keepAliveRef.current); keepAliveRef.current = null; }
  }, []);

  const stopAll = useCallback(() => {
    // Stop static audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
      isStaticRef.current = false;
    }
    // Stop Web Speech
    window.speechSynthesis.cancel();
    clearKeepAlive();
    setIsPlaying(false);
    setIsPaused(false);
    setUsingStaticAudio(false);
  }, [clearKeepAlive]);

  // Load browser voices
  const loadVoices = useCallback(() => {
    setVoices(window.speechSynthesis.getVoices());
  }, []);

  useEffect(() => {
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, [loadVoices]);

  // Auto-select a gender-matched voice on mount / gender change
  useEffect(() => {
    if (!voices.length) return;
    const match = voices.find(v => guessGender(v) === gender);
    if (match) {
      setSelectedVoice(match.name);
    } else {
      const { pitch: basePitch } = TEXTURE_PRESETS[texture];
      const offset = gender === 'female' ? 0.3 : -0.2;
      setPitch(p => {
        const next = Math.min(2, Math.max(0.5, basePitch + offset));
        return Math.abs(p - next) > 0.05 ? next : p;
      });
    }
  }, [gender, voices]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync texture → rate + pitch
  useEffect(() => {
    const { rate: r, pitch: p } = TEXTURE_PRESETS[texture];
    setRate(r); setPitch(p);
  }, [texture]);

  // Auto-select best Devanagari voice on Nepali pages
  useEffect(() => {
    if (!hasDevanagari(text) || !voices.length) return;
    const best = voices
      .filter(v => isDevanagariVoice(v))
      .sort((a, b) => voiceQuality(b) - voiceQuality(a))[0];
    if (best) setSelectedVoice(best.name);
  }, [text, voices]);

  // Check whether a pre-recorded MP3 exists for this page
  useEffect(() => {
    if (pageNumber === undefined) { setHasStaticAudio(false); return; }
    let active = true;
    fetch(`/audio/page-${pageNumber}.mp3`, { method: 'HEAD' })
      .then(r => { if (active) setHasStaticAudio(r.ok); })
      .catch(() => { if (active) setHasStaticAudio(false); });
    return () => { active = false; };
  }, [pageNumber]);

  // Stop on page turn
  useEffect(() => { stopAll(); }, [text, stopAll]);

  // --- Playback ---

  const playStaticAudio = () => {
    if (pageNumber === undefined) return;
    const audio = new Audio(`/audio/page-${pageNumber}.mp3`);
    audioRef.current = audio;
    isStaticRef.current = true;
    setUsingStaticAudio(true);

    audio.volume  = volume;
    audio.onplay  = () => { setIsPlaying(true);  setIsPaused(false); };
    audio.onpause = () => { if (!audio.ended) setIsPaused(true); };
    audio.onended = () => {
      setIsPlaying(false); setIsPaused(false);
      setUsingStaticAudio(false); isStaticRef.current = false;
    };
    audio.onerror = () => {
      setIsPlaying(false); setIsPaused(false);
      setUsingStaticAudio(false); isStaticRef.current = false;
    };
    audio.play().catch(() => {
      setIsPlaying(false); setUsingStaticAudio(false); isStaticRef.current = false;
    });
  };

  const speakWebSpeech = () => {
    const isNepali = hasDevanagari(text);
    const spokenText = isNepali ? cleanForSpeech(text) : text;
    if (!spokenText.trim()) return;

    const utterance = new SpeechSynthesisUtterance(spokenText);

    if (isNepali) {
      utterance.lang = 'ne-NP';
      const devanagariVoice =
        voices.find(v => v.name === selectedVoice && isDevanagariVoice(v)) ??
        voices.filter(v => isDevanagariVoice(v)).sort((a, b) => voiceQuality(b) - voiceQuality(a))[0] ??
        voices.find(v => v.name === selectedVoice) ??
        voices[0];
      if (devanagariVoice) utterance.voice = devanagariVoice;
    } else {
      const voice = voices.find(v => v.name === selectedVoice) ?? voices[0];
      if (voice) utterance.voice = voice;
    }

    utterance.rate = rate; utterance.pitch = pitch; utterance.volume = volume;
    utterance.onstart = () => {
      setIsPlaying(true); setIsPaused(false);
      clearKeepAlive();
      // Chrome silently stops speech after ~15 s; keep-alive prevents that
      keepAliveRef.current = setInterval(() => {
        if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }, 14000);
    };
    utterance.onend    = () => { setIsPlaying(false); setIsPaused(false); clearKeepAlive(); };
    utterance.onerror  = () => { setIsPlaying(false); setIsPaused(false); clearKeepAlive(); };
    utterance.onpause  = () => setIsPaused(true);
    utterance.onresume = () => setIsPaused(false);
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const speak = () => {
    if (!text) return;
    stopAll();
    if (hasStaticAudio && pageNumber !== undefined) {
      playStaticAudio();
    } else {
      speakWebSpeech();
    }
  };

  const togglePause = () => {
    if (isStaticRef.current && audioRef.current) {
      if (isPaused) audioRef.current.play().catch(() => {});
      else          audioRef.current.pause();
      // state updated by audio.onpause / audio.onplay events
    } else {
      if (isPaused) { window.speechSynthesis.resume(); setIsPaused(false); }
      else          { window.speechSynthesis.pause();  setIsPaused(true);  }
    }
  };

  // --- Voice picker ---

  const isDevanagariPage = hasDevanagari(text);
  const filteredVoices = voices
    .filter(v => {
      if (isDevanagariPage) return isDevanagariVoice(v);
      const g = guessGender(v);
      return g === gender || g === null;
    })
    .sort((a, b) => voiceQuality(b) - voiceQuality(a));

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-colors mb-2 ${
          isPlaying
            ? 'bg-gold text-navy-900 animate-pulse'
            : 'bg-gold text-navy-900 hover:bg-gold-light'
        }`}
        title="Voice Reader"
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
        </svg>
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="absolute bottom-14 right-0 w-72 bg-navy-800 border border-gold/30 rounded-lg shadow-2xl p-5">
          <h3 className="text-gold font-serif text-lg mb-1 flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
            Voice Reader
            {hasStaticAudio && (
              <span className="ml-auto text-[10px] font-sans font-semibold tracking-wide text-gold bg-gold/15 border border-gold/30 px-2 py-0.5 rounded-full">
                ★ Recorded
              </span>
            )}
          </h3>

          {/* Source indicator */}
          <p className="text-[10px] text-cream-300/35 mb-4">
            {hasStaticAudio
              ? 'Pre-recorded Nepali neural audio — highest quality'
              : 'Live browser TTS — quality depends on installed voices'}
          </p>

          {!text && (
            <p className="text-xs text-gold/60 mb-3 bg-gold/10 rounded px-2 py-1.5 border border-gold/15">
              No text stored for this page.
            </p>
          )}

          {/* Voice Type — only relevant when no pre-recorded audio */}
          {!hasStaticAudio && (
            <div className="mb-4">
              <label className="text-cream-300 text-xs uppercase tracking-wider block mb-2">Voice Type</label>
              <div className="flex gap-2">
                {(['female', 'male'] as Gender[]).map(g => (
                  <button
                    key={g}
                    onClick={() => setGender(g)}
                    className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors ${
                      gender === g
                        ? 'bg-gold text-navy-900'
                        : 'bg-navy-900 border border-gold/20 text-cream-300 hover:border-gold/40'
                    }`}
                  >
                    {g === 'female' ? '♀ Female' : '♂ Male'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Texture — only for live TTS */}
          {!hasStaticAudio && (
            <div className="mb-4">
              <label className="text-cream-300 text-xs uppercase tracking-wider block mb-2">Texture</label>
              <div className="flex gap-1.5">
                {(['smooth', 'natural', 'expressive'] as Texture[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setTexture(t)}
                    className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors capitalize ${
                      texture === t
                        ? 'bg-gold/90 text-navy-900'
                        : 'bg-navy-900 border border-gold/20 text-cream-300 hover:border-gold/40'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Voice picker — only for live TTS */}
          {!hasStaticAudio && (
            isDevanagariPage ? (
              <div className="mb-4">
                <label className="text-cream-300 text-xs uppercase tracking-wider flex justify-between mb-1">
                  <span>Voice — Devanagari</span>
                  {filteredVoices.length > 0 && (
                    <span className="text-gold/50 normal-case font-normal">★ = premium</span>
                  )}
                </label>
                {filteredVoices.length > 0 ? (
                  <select
                    value={selectedVoice}
                    onChange={e => setSelectedVoice(e.target.value)}
                    className="w-full bg-navy-900 border border-gold/20 text-cream-200 rounded px-3 py-2 text-sm focus:border-gold outline-none"
                  >
                    {filteredVoices.map(v => (
                      <option key={v.name} value={v.name}>
                        {voiceQuality(v) === 3 ? '★ ' : ''}{v.name}
                        {' '}({v.lang}){' '}
                        {guessGender(v) === 'female' ? '♀' : guessGender(v) === 'male' ? '♂' : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-gold/60 bg-gold/10 rounded px-2 py-1.5 border border-gold/15 leading-relaxed">
                    No Hindi/Nepali voice installed. Add a Hindi (hi‑IN) voice in your OS settings for best results.
                  </p>
                )}
              </div>
            ) : (
              filteredVoices.length > 1 && (
                <div className="mb-4">
                  <label className="text-cream-300 text-xs uppercase tracking-wider block mb-1">Voice</label>
                  <select
                    value={selectedVoice}
                    onChange={e => setSelectedVoice(e.target.value)}
                    className="w-full bg-navy-900 border border-gold/20 text-cream-200 rounded px-3 py-2 text-sm focus:border-gold outline-none"
                  >
                    {filteredVoices.map(v => (
                      <option key={v.name} value={v.name}>
                        {voiceQuality(v) === 3 ? '★ ' : ''}{v.name}
                      </option>
                    ))}
                  </select>
                </div>
              )
            )
          )}

          {/* Volume */}
          <div className="mb-4">
            <label className="text-cream-300 text-xs uppercase tracking-wider flex justify-between mb-1">
              <span>Volume</span>
              <span className="text-gold">{Math.round(volume * 100)}%</span>
            </label>
            <input type="range" min="0" max="1" step="0.05" value={volume}
              onChange={e => setVolume(Number(e.target.value))}
              className="w-full accent-gold h-1.5"
            />
          </div>

          {/* Advanced speed + pitch — only for live TTS */}
          {!hasStaticAudio && (
            <>
              <button
                onClick={() => setShowAdvanced(a => !a)}
                className="text-xs text-cream-300/40 hover:text-cream-300/70 transition-colors mb-3 flex items-center gap-1"
              >
                <svg
                  className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
                  fill="currentColor" viewBox="0 0 24 24"
                >
                  <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                </svg>
                Advanced
              </button>
              {showAdvanced && (
                <div className="mb-4 space-y-3">
                  <div>
                    <label className="text-cream-300 text-xs uppercase tracking-wider flex justify-between mb-1">
                      <span>Speed</span><span className="text-gold">{rate.toFixed(1)}×</span>
                    </label>
                    <input type="range" min="0.5" max="2" step="0.1" value={rate}
                      onChange={e => setRate(Number(e.target.value))}
                      className="w-full accent-gold h-1.5"
                    />
                  </div>
                  <div>
                    <label className="text-cream-300 text-xs uppercase tracking-wider flex justify-between mb-1">
                      <span>Pitch</span><span className="text-gold">{pitch.toFixed(1)}</span>
                    </label>
                    <input type="range" min="0.5" max="2" step="0.1" value={pitch}
                      onChange={e => setPitch(Number(e.target.value))}
                      className="w-full accent-gold h-1.5"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Play / Pause / Stop */}
          <div className="flex gap-2">
            {!isPlaying ? (
              <button
                onClick={speak}
                disabled={!text}
                className="flex-1 py-2 bg-gold text-navy-900 rounded font-medium text-sm hover:bg-gold-light transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                Read Aloud
              </button>
            ) : (
              <>
                <button
                  onClick={togglePause}
                  className="flex-1 py-2 bg-navy-700 text-cream-200 rounded text-sm hover:bg-navy-600 transition-colors flex items-center justify-center gap-2 border border-gold/20"
                >
                  {isPaused
                    ? <><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>Resume</>
                    : <><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>Pause</>
                  }
                </button>
                <button
                  onClick={stopAll}
                  className="py-2 px-3 bg-navy-700 text-cream-300 rounded text-sm hover:bg-navy-600 transition-colors border border-gold/20"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>
                </button>
              </>
            )}
          </div>

          {isPlaying && (
            <p className="text-xs text-gold/70 mt-2 text-center animate-pulse">
              {isPaused
                ? 'Paused'
                : usingStaticAudio
                  ? '♪ Playing recorded audio…'
                  : '♪ Reading aloud…'
              }
            </p>
          )}

          {!hasStaticAudio && voices.length === 0 && (
            <p className="text-xs text-cream-300/50 mt-2">No voices available in this browser.</p>
          )}
        </div>
      )}
    </div>
  );
}
