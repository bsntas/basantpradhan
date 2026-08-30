'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface VoiceControlsProps {
  text: string;
}

export default function VoiceControls({ text }: VoiceControlsProps) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [rate, setRate] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);
  const [volume, setVolume] = useState(1.0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const loadVoices = useCallback(() => {
    const v = window.speechSynthesis.getVoices();
    setVoices(v);
    if (v.length && !selectedVoice) setSelectedVoice(v[0].name);
  }, [selectedVoice]);

  useEffect(() => {
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, [loadVoices]);

  // Stop speech when text changes (page turned)
  useEffect(() => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
  }, [text]);

  const speak = () => {
    if (!text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = voices.find(v => v.name === selectedVoice);
    if (voice) utterance.voice = voice;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;
    utterance.onstart = () => { setIsPlaying(true); setIsPaused(false); };
    utterance.onend = () => { setIsPlaying(false); setIsPaused(false); };
    utterance.onerror = () => { setIsPlaying(false); setIsPaused(false); };
    utterance.onpause = () => setIsPaused(true);
    utterance.onresume = () => setIsPaused(false);
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const togglePause = () => {
    if (isPaused) { window.speechSynthesis.resume(); setIsPaused(false); }
    else { window.speechSynthesis.pause(); setIsPaused(true); }
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 rounded-full bg-gold text-navy-900 flex items-center justify-center shadow-lg hover:bg-gold-light transition-colors mb-2"
        title="Voice Controls"
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
        </svg>
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="absolute bottom-14 right-0 w-72 bg-navy-800 border border-gold/30 rounded-lg shadow-2xl p-5 animate-fade-in">
          <h3 className="text-gold font-serif text-lg mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
            Voice Reader
          </h3>

          {/* Voice select */}
          <div className="mb-4">
            <label className="text-cream-300 text-xs uppercase tracking-wider block mb-1">Voice</label>
            <select
              value={selectedVoice}
              onChange={e => setSelectedVoice(e.target.value)}
              className="w-full bg-navy-900 border border-gold/20 text-cream-200 rounded px-3 py-2 text-sm focus:border-gold outline-none"
            >
              {voices.map(v => (
                <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
              ))}
            </select>
          </div>

          {/* Speed */}
          <div className="mb-3">
            <label className="text-cream-300 text-xs uppercase tracking-wider flex justify-between mb-1">
              <span>Speed</span><span className="text-gold">{rate.toFixed(1)}×</span>
            </label>
            <input type="range" min="0.5" max="2" step="0.1" value={rate}
              onChange={e => setRate(Number(e.target.value))}
              className="w-full accent-gold h-1.5"
            />
            <div className="flex justify-between text-xs text-cream-300/50 mt-0.5"><span>0.5×</span><span>2×</span></div>
          </div>

          {/* Pitch */}
          <div className="mb-3">
            <label className="text-cream-300 text-xs uppercase tracking-wider flex justify-between mb-1">
              <span>Pitch</span><span className="text-gold">{pitch.toFixed(1)}</span>
            </label>
            <input type="range" min="0.5" max="2" step="0.1" value={pitch}
              onChange={e => setPitch(Number(e.target.value))}
              className="w-full accent-gold h-1.5"
            />
          </div>

          {/* Volume */}
          <div className="mb-5">
            <label className="text-cream-300 text-xs uppercase tracking-wider flex justify-between mb-1">
              <span>Volume</span><span className="text-gold">{Math.round(volume * 100)}%</span>
            </label>
            <input type="range" min="0" max="1" step="0.05" value={volume}
              onChange={e => setVolume(Number(e.target.value))}
              className="w-full accent-gold h-1.5"
            />
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            {!isPlaying ? (
              <button onClick={speak}
                className="flex-1 py-2 bg-gold text-navy-900 rounded font-medium text-sm hover:bg-gold-light transition-colors flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                Read Aloud
              </button>
            ) : (
              <>
                <button onClick={togglePause}
                  className="flex-1 py-2 bg-navy-700 text-cream-200 rounded text-sm hover:bg-navy-600 transition-colors flex items-center justify-center gap-2 border border-gold/20">
                  {isPaused
                    ? <><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> Resume</>
                    : <><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> Pause</>
                  }
                </button>
                <button onClick={stop}
                  className="py-2 px-3 bg-navy-700 text-cream-300 rounded text-sm hover:bg-navy-600 transition-colors border border-gold/20">
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
