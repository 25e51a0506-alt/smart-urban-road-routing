import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  PhoneCall,
  Volume2,
  VolumeX,
  Share2,
  AlertOctagon,
  Copy,
  Check,
  Shield,
  Zap,
} from 'lucide-react';
import { Coordinates } from './types';

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCoords: Coordinates | null;
}

export const EmergencyModal: React.FC<EmergencyModalProps> = ({
  isOpen,
  onClose,
  currentCoords,
}) => {
  const [isSirenPlaying, setIsSirenPlaying] = useState(false);
  const [isStrobeActive, setIsStrobeActive] = useState(false);
  const [copied, setCopied] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const sirenIntervalRef = useRef<any>(null);

  if (!isOpen) return null;

  const lat = currentCoords ? currentCoords[0].toFixed(5) : '17.59560';
  const lng = currentCoords ? currentCoords[1].toFixed(5) : '78.43580';
  const distressMsg = `EMERGENCY ALERT: I require immediate assistance. My real-time GPS location: https://maps.google.com/?q=${lat},${lng} (Lat: ${lat}, Lng: ${lng})`;

  const handleCopyDistress = () => {
    navigator.clipboard.writeText(distressMsg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Synthesize audible siren with Web Audio API
  const toggleSiren = () => {
    if (isSirenPlaying) {
      stopSiren();
    } else {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;

        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(650, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start();
        oscillatorRef.current = osc;

        let high = false;
        sirenIntervalRef.current = setInterval(() => {
          if (oscillatorRef.current && audioCtxRef.current) {
            high = !high;
            oscillatorRef.current.frequency.setTargetAtTime(
              high ? 950 : 650,
              audioCtxRef.current.currentTime,
              0.1
            );
          }
        }, 350);

        setIsSirenPlaying(true);
      } catch (err) {
        console.error('Audio synthesis failed', err);
      }
    }
  };

  const stopSiren = () => {
    if (sirenIntervalRef.current) {
      clearInterval(sirenIntervalRef.current);
      sirenIntervalRef.current = null;
    }
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
        oscillatorRef.current.disconnect();
      } catch {}
      oscillatorRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    setIsSirenPlaying(false);
  };

  const handleClose = () => {
    stopSiren();
    setIsStrobeActive(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      {/* Strobe screen overlay if activated */}
      {isStrobeActive && (
        <div
          className="fixed inset-0 pointer-events-none z-[6100] animate-ping"
          style={{ backgroundColor: 'rgba(239, 68, 68, 0.45)' }}
        />
      )}

      <div className="bg-slate-900 border-2 border-rose-600/80 rounded-3xl max-w-md w-full p-6 shadow-2xl text-slate-100 relative z-[6200]">
        <div className="flex justify-between items-center pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-600/20 text-rose-500 animate-pulse">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Emergency SOS Dispatch</h3>
              <p className="text-[11px] text-rose-400">Immediate Rapid Response & Deterrence</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 my-4">
          {/* Direct Emergency Call */}
          <div className="grid grid-cols-2 gap-3">
            <a
              href="tel:112"
              className="p-3.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-2xl flex flex-col items-center justify-center shadow-lg shadow-rose-900/40 transition group"
            >
              <PhoneCall className="w-6 h-6 mb-1 group-hover:scale-110 transition" />
              <span className="text-sm">Call 112 (Police)</span>
              <span className="text-[10px] font-normal text-rose-100">National Emergency</span>
            </a>

            <a
              href="tel:1091"
              className="p-3.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold rounded-2xl flex flex-col items-center justify-center border border-slate-700 transition group"
            >
              <Shield className="w-6 h-6 mb-1 text-amber-400 group-hover:scale-110 transition" />
              <span className="text-sm">1091 Helpline</span>
              <span className="text-[10px] font-normal text-slate-400">Women & Scholar Safety</span>
            </a>
          </div>

          {/* Hardware Deterrents: Audible Siren & Screen Beacon */}
          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Deterrence & Attention Beacons
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={toggleSiren}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-semibold border transition ${
                  isSirenPlaying
                    ? 'bg-rose-600 text-white border-rose-500 animate-pulse'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
              >
                {isSirenPlaying ? (
                  <>
                    <VolumeX className="w-4 h-4" /> Stop Siren
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 text-rose-400" /> Sound Loud Siren
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsStrobeActive(!isStrobeActive)}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-semibold border transition ${
                  isStrobeActive
                    ? 'bg-amber-600 text-white border-amber-500'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
              >
                <Zap className="w-4 h-4 text-amber-400" />
                {isStrobeActive ? 'Stop Strobe' : 'Strobe Flash Beacon'}
              </button>
            </div>
          </div>

          {/* Quick Share Coordinates with Trusted Contacts */}
          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Distress Message & Live Coordinates
              </span>
              <button
                type="button"
                onClick={handleCopyDistress}
                className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied!' : 'Copy Text'}
              </button>
            </div>

            <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-[11px] font-mono text-slate-300 select-all">
              {distressMsg}
            </div>

            <div className="flex gap-2 pt-1">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(distressMsg)}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2 px-3 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold rounded-xl text-center text-xs flex items-center justify-center gap-1.5 transition"
              >
                <Share2 className="w-3.5 h-3.5" /> Send via WhatsApp
              </a>
              <a
                href={`sms:?body=${encodeURIComponent(distressMsg)}`}
                className="flex-1 py-2 px-3 bg-blue-700 hover:bg-blue-600 text-white font-semibold rounded-xl text-center text-xs flex items-center justify-center gap-1.5 transition"
              >
                <Share2 className="w-3.5 h-3.5" /> Send SMS
              </a>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
          >
            Dismiss SOS
          </button>
        </div>
      </div>
    </div>
  );
};
