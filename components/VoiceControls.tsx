'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface VoiceControlsProps {
  text: string;
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

function guessGender(voice: SpeechSynthesisVoice): Gender | null {
  const n = voice.name.toLowerCase();
  if (FEMALE_HINTS.some(h => n.includes(h))) return 'female';
  if (MALE_HINTS.some(h => n.includes(h)))   return 'male';
  return null;
}

export default function VoiceControls({ text }: VoiceControlsProps) {
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
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const loadVoices = useCallback(() => {
    const v = window.speechSynthesis.getVoices();
    setVoices(v);
  }, []);

  useEffect(() => {
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, [loadVoices]);

  // When gender changes, try to auto-select a matching voice; fall back to pitch offset
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

  // When texture changes, update rate + pitch
  useEffect(() => {
    const { rate: r, pitch: p } = TEXTURE_PRESETS[texture];
    setRate(r);
    setPitch(p);
  }, [texture]);

  // Stop on page turn
  useEffect(() => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
  }, [text]);

  const speak = () => {
    if (!text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = voices.find(v => v.name === selectedVoice) ?? voices[0];
    if (voice) utterance.voice = voice;
    utterance.rate   = rate;
    utterance.pitch  = pitch;
    utterance.volume = volume;
    utterance.onstart  = () => { setIsPlaying(true);  setIsPaused(false); };
    utterance.onend    = () => { setIsPlaying(false); setIsPaused(false); };
    utterance.onerror  = () => { setIsPlaying(false); setIsPaused(false); };
    utterance.onpause  = () => setIsPaused(true);
    utterance.onresume = () => setIsPaused(false);
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const togglePause = () => {
    if (isPaused) { window.speechSynthesis.resume(); setIsPaused(false); }
    else          { window.speechSynthesis.pause();  setIsPaused(true);  }
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
  };

  const filteredVoices = voices.filter(v => {
    const g = guessGender(v);
    return g === gender || g === null;
  });

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
          <h3 className="text-gold font-serif text-lg mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
            Voice Reader
          </h3>

          {!text && (
            <p className="text-xs text-gold/60 mb-3 bg-gold/10 rounded px-2 py-1.5 border border-gold/15">
              No text stored for this page.
            </p>
          )}

          {/* Voice Type */}
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

          {/* Texture */}
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

          {/* Voice picker (filtered to gender) */}
          {filteredVoices.length > 1 && (
            <div className="mb-4">
              <label className="text-cream-300 text-xs uppercase tracking-wider block mb-1">Voice</label>
              <select
                value={selectedVoice}
                onChange={e => setSelectedVoice(e.target.value)}
                className="w-full bg-navy-900 border border-gold/20 text-cream-200 rounded px-3 py-2 text-sm focus:border-gold outline-none"
              >
                {filteredVoices.map(v => (
                  <option key={v.name} value={v.name}>{v.name}</option>
                ))}
              </select>
            </div>
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

          {/* Advanced (speed + pitch) */}
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
                  onClick={stop}
                  className="py-2 px-3 bg-navy-700 text-cream-300 rounded text-sm hover:bg-navy-600 transition-colors border border-gold/20"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>
                </button>
              </>
            )}
          </div>

          {isPlaying && (
            <p className="text-xs text-gold/70 mt-2 text-center animate-pulse">
              {isPaused ? 'Paused' : '♪ Reading…'}
            </p>
          )}

          {voices.length === 0 && (
            <p className="text-xs text-cream-300/50 mt-2">No voices available in this browser.</p>
          )}
        </div>
      )}
    </div>
  );
}
