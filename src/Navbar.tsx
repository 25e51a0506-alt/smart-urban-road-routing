import React, { useState } from 'react';
import {
  Shield,
  Layers,
  PhoneCall,
  PlusCircle,
  LogIn,
  LogOut,
  MapPin,
  ChevronDown,
  Info,
  Check,
  Eye,
  EyeOff,
  Radio,
  Box,
  Compass,
} from 'lucide-react';
import { UserProfile } from './types';
import { DEMO_PRESETS, DemoPreset } from './services/storage';

interface NavbarProps {
  user: UserProfile | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenReportModal: () => void;
  onOpenEmergencyModal: () => void;
  onOpenMethodology: () => void;
  activePresetId: string;
  onSelectPreset: (preset: DemoPreset) => void;
  showHazards: boolean;
  onToggleHazards: () => void;
  showBuffers: boolean;
  onToggleBuffers: () => void;
  isTrackingGps?: boolean;
  gpsAccuracy?: number | null;
  is3DActive?: boolean;
  onToggle3D?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onOpenAuth,
  onLogout,
  onOpenReportModal,
  onOpenEmergencyModal,
  onOpenMethodology,
  activePresetId,
  onSelectPreset,
  showHazards,
  onToggleHazards,
  showBuffers,
  onToggleBuffers,
  isTrackingGps = false,
  gpsAccuracy = null,
  is3DActive = false,
  onToggle3D,
}) => {
  const [isLayersOpen, setIsLayersOpen] = useState(false);
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);

  const activePreset = DEMO_PRESETS.find((p) => p.id === activePresetId) || DEMO_PRESETS[0];

  return (
    <header className="bg-[#0b1329] border-b border-blue-900/40 text-white z-30 relative shadow-2xl">
      {/* Primary Top Bar */}
      <div className="px-4 py-2.5 flex items-center justify-between gap-3">
        {/* Brand & Preset Hub */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-blue-500 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-600/30 border border-blue-400/30">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-sm sm:text-base tracking-tight leading-none text-white">
                  Smart Urban Road Routing
                </h1>
                <span className="text-[10px] bg-blue-950 text-blue-300 border border-blue-800 px-1.5 py-0.2 rounded font-mono hidden md:inline">
                  LIVE GPS
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                Navigation & Road-Safety Platform
              </p>
            </div>
          </div>

          {/* GPS Live Telemetry Status Pill */}
          <div className="hidden lg:flex items-center">
            {isTrackingGps ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 text-xs font-semibold shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>GPS Active (±{gpsAccuracy ?? 8}m)</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#070d1e] border border-slate-800 text-slate-400 text-xs">
                <Radio className="w-3 h-3 text-slate-500" />
                <span>GPS Ready</span>
              </div>
            )}
          </div>

          {/* Region / City Preset Selector */}
          <div className="relative ml-1 sm:ml-2">
            <button
              type="button"
              onClick={() => setIsPresetsOpen(!isPresetsOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#070d1e] hover:bg-[#0e1834] border border-slate-800 text-xs text-slate-300 font-medium transition"
            >
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              <span className="max-w-[120px] sm:max-w-[160px] truncate">{activePreset.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isPresetsOpen && (
              <div className="absolute left-0 mt-2 w-64 bg-[#0b1329] border border-slate-700 rounded-2xl shadow-2xl z-50 p-2 divide-y divide-slate-800 animate-fade-in">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Select Active City / Campus
                </div>
                <div className="py-1 space-y-1">
                  {DEMO_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => {
                        onSelectPreset(preset);
                        setIsPresetsOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-xl text-xs transition flex items-center justify-between ${
                        preset.id === activePresetId
                          ? 'bg-blue-600/20 text-blue-300 border border-blue-600/40'
                          : 'hover:bg-slate-800 text-slate-200'
                      }`}
                    >
                      <div>
                        <p className="font-semibold">{preset.name}</p>
                        <p className="text-[10px] text-slate-400 line-clamp-1">{preset.description}</p>
                      </div>
                      {preset.id === activePresetId && <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* 3D Route Perspective Toggle */}
          {onToggle3D && (
            <button
              type="button"
              onClick={onToggle3D}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition ${
                is3DActive
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                  : 'bg-[#070d1e] hover:bg-[#0e1834] text-slate-300 border-slate-800'
              }`}
              title="Toggle 3D Route Perspective"
            >
              <Box className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">{is3DActive ? '2D Map' : '3D View'}</span>
            </button>
          )}

          {/* Layer Controls Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsLayersOpen(!isLayersOpen)}
              className="p-2 rounded-xl bg-[#070d1e] hover:bg-[#0e1834] border border-slate-800 text-slate-300 hover:text-white transition"
              title="Map View & Layer Controls"
            >
              <Layers className="w-4 h-4 text-blue-400" />
            </button>

            {isLayersOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-[#0b1329] border border-slate-700 rounded-2xl shadow-2xl z-50 p-3 space-y-3 text-xs animate-fade-in">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">
                    Base Map Provider
                  </span>
                  <div className="p-2 rounded-xl bg-[#070d1e] border border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-200">OpenStreetMap Standard</p>
                      <p className="text-[10px] text-slate-400">Raster Tiles (No API watermark)</p>
                    </div>
                    <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded font-mono">
                      Active
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                    Safety Overlays
                  </span>
                  <button
                    type="button"
                    onClick={onToggleHazards}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg bg-[#070d1e] hover:bg-slate-800 text-slate-200 transition"
                  >
                    <span>Community Hazard Pins</span>
                    {showHazards ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
                  </button>

                  <button
                    type="button"
                    onClick={onToggleBuffers}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg bg-[#070d1e] hover:bg-slate-800 text-slate-200 transition"
                  >
                    <span>Hazard Proximity Halo (250m)</span>
                    {showBuffers ? <Check className="w-3.5 h-3.5 text-blue-400" /> : <span className="text-slate-500 text-[10px]">Off</span>}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Methodology Info */}
          <button
            type="button"
            onClick={onOpenMethodology}
            className="p-2 rounded-xl bg-[#070d1e] hover:bg-[#0e1834] border border-slate-800 text-slate-300 hover:text-white transition hidden md:block"
            title="Safety Algorithm Methodology"
          >
            <Info className="w-4 h-4 text-blue-400" />
          </button>

          {/* SOS Emergency Trigger */}
          <button
            type="button"
            onClick={onOpenEmergencyModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-900/40 transition active:scale-95"
          >
            <PhoneCall className="w-3.5 h-3.5 animate-pulse" />
            <span>SOS</span>
          </button>

          {/* Report Hazard button */}
          <button
            type="button"
            onClick={onOpenReportModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-600/30 transition active:scale-95"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Report Hazard</span>
          </button>

          {/* User Auth Chip */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-white leading-tight">{user.name}</p>
                <p className="text-[9px] text-blue-400 uppercase tracking-wider">{user.role.replace('_', ' ')}</p>
              </div>
              <button
                type="button"
                onClick={onLogout}
                title="Sign Out"
                className="p-2 bg-[#070d1e] hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#070d1e] hover:bg-[#0e1834] border border-slate-800 text-white text-xs font-semibold rounded-xl transition"
            >
              <LogIn className="w-3.5 h-3.5 text-blue-400" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>

      {/* Safety Advisory Banner (Requirement 2) */}
      <div className="bg-[#070d1e] border-t border-blue-900/30 px-4 py-1.5 flex items-center justify-between text-[11px] text-slate-300 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-white">Active Road Safety Shield:</span>
          <span className="text-slate-300">
            Real-time 100m hazard proximity watch & crowdsourced corridor verification active in {activePreset.city}.
          </span>
        </div>

        <div className="hidden md:flex items-center gap-3 text-[10px] text-slate-400 pl-4 min-w-max">
          <span>Routing: GraphHopper / OSRM</span>
          <span>•</span>
          <span>Tiles: OpenStreetMap</span>
          <span>•</span>
          <span>AI Grounding: Google Search</span>
        </div>
      </div>
    </header>
  );
};
