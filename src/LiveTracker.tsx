import React, { useEffect, useState, useRef } from 'react';
import {
  Compass,
  Play,
  Square,
  AlertCircle,
  Crosshair,
  Footprints,
  Radio,
  Clock,
  Shield,
  LocateFixed,
  Bell,
  BellRing,
  AlertTriangle,
} from 'lucide-react';
import { Coordinates } from './types';
import { NearbyHazardAlert } from './hooks/useHazardProximityAlert';

interface LiveTrackerProps {
  onLocationUpdate: (coords: Coordinates, accuracy: number) => void;
  onTrackingStateChange: (tracking: boolean) => void;
  onCenterOnUser: () => void;
  currentCoords: Coordinates | null;
  accuracy: number | null;
  nearbyHazards?: NearbyHazardAlert[];
  notificationPermission?: NotificationPermission | 'unsupported';
  onRequestNotificationPermission?: () => void;
}

export const LiveTracker: React.FC<LiveTrackerProps> = ({
  onLocationUpdate,
  onTrackingStateChange,
  onCenterOnUser,
  currentCoords,
  accuracy,
  nearbyHazards = [],
  notificationPermission,
  onRequestNotificationPermission,
}) => {
  const [isTracking, setIsTracking] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const simulationIntervalRef = useRef<any>(null);

  const startTracking = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }

    // Stop simulation if running
    stopSimulation();

    setErrorMsg(null);
    setIsTracking(true);
    onTrackingStateChange(true);

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const coords: Coordinates = [pos.coords.latitude, pos.coords.longitude];
        setLastUpdate(new Date().toLocaleTimeString());
        onLocationUpdate(coords, Math.round(pos.coords.accuracy));
      },
      (err) => {
        let msg = 'Failed to obtain GPS fix.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Permission denied. Please grant location access in your browser address bar.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'GPS signal unavailable. Ensure location sensors or Wi-Fi location are enabled.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'GPS satellite request timed out.';
        }
        setErrorMsg(msg);
        stopTracking();
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 1000,
      }
    );

    setWatchId(id);
  };

  const stopTracking = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsTracking(false);
    onTrackingStateChange(false);
  };

  // Walking simulation for testing/evaluations
  const toggleSimulation = () => {
    if (isSimulating) {
      stopSimulation();
    } else {
      stopTracking();
      setIsSimulating(true);
      setIsTracking(true);
      onTrackingStateChange(true);

      let baseLat = currentCoords ? currentCoords[0] : 17.5956;
      let baseLng = currentCoords ? currentCoords[1] : 78.4358;
      let stepCount = 0;

      simulationIntervalRef.current = setInterval(() => {
        stepCount++;
        // Walk slightly north-east along road corridor
        baseLat += 0.00015;
        baseLng += 0.00018;

        const simulated: Coordinates = [baseLat, baseLng];
        setLastUpdate(new Date().toLocaleTimeString());
        onLocationUpdate(simulated, 8); // 8m simulated high-accuracy GPS
      }, 2000);
    }
  };

  const stopSimulation = () => {
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
    setIsSimulating(false);
  };

  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
      }
    };
  }, [watchId]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-1 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-400">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Live GPS Telemetry</h3>
            <p className="text-[10px] text-slate-400">Browser Geolocation Stream & Compass</p>
          </div>
        </div>

        {/* Start / Stop toggle */}
        <div className="flex items-center gap-1.5">
          {currentCoords && (
            <button
              type="button"
              onClick={onCenterOnUser}
              title="Center map on my location"
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition"
            >
              <LocateFixed className="w-3.5 h-3.5 text-blue-400" />
            </button>
          )}

          <button
            type="button"
            onClick={isTracking ? (isSimulating ? stopSimulation : stopTracking) : startTracking}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold shadow transition ${
              isTracking
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {isTracking ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" /> Stop
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" /> Start GPS
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-2.5 bg-rose-950/60 border border-rose-800/80 rounded-xl text-xs text-rose-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
          <div className="flex-1">
            <p className="font-semibold">{errorMsg}</p>
            <p className="text-[10px] text-rose-400/80 mt-0.5">
              Tip: You can use the "Simulate Walk Motion" button below to demo live tracking without outdoor GPS hardware.
            </p>
          </div>
        </div>
      )}

      {/* Active telemetry info */}
      {isTracking && currentCoords ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              {isSimulating ? 'Simulated Commuter Motion' : 'Active Satellite Tracking'}
            </span>
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {lastUpdate || 'Connecting...'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800">
              <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Latitude</span>
              <p className="font-mono font-semibold text-slate-100">{currentCoords[0].toFixed(5)}° N</p>
            </div>
            <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800">
              <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Longitude</span>
              <p className="font-mono font-semibold text-slate-100">{currentCoords[1].toFixed(5)}° E</p>
            </div>
            <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800">
              <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Sensor Accuracy</span>
              <p className="font-semibold text-blue-400">±{accuracy ?? 10} meters</p>
            </div>
            <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800">
              <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Safety Status</span>
              <p className="font-semibold text-emerald-400 flex items-center gap-1">
                <Shield className="w-3 h-3" /> Monitoring Buffer
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-xs text-slate-400 py-1">
          <p>
            {isTracking
              ? 'Requesting browser GPS fix (allowing high accuracy)...'
              : 'Live tracking idle. Turn on GPS to monitor your real-time coordinates, accuracy ring, and route adherence.'}
          </p>
        </div>
      )}

      {/* 100m Proximity Hazard Shield Status */}
      <div className="p-2.5 rounded-xl border bg-slate-950/80 border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <BellRing className={`w-3.5 h-3.5 ${nearbyHazards.length > 0 ? 'text-rose-400 animate-pulse' : 'text-blue-400'}`} />
            <span className="text-xs font-bold text-white">100m Hazard Proximity Shield</span>
          </div>
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
            nearbyHazards.length > 0
              ? 'bg-rose-950 text-rose-300 border border-rose-800'
              : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
          }`}>
            {nearbyHazards.length > 0 ? `${nearbyHazards.length} Alert(s)` : 'Clear (<100m)'}
          </span>
        </div>

        {nearbyHazards.length > 0 ? (
          <div className="space-y-1">
            {nearbyHazards.map((item, idx) => (
              <div
                key={idx}
                className="p-1.5 bg-rose-950/60 border border-rose-800/80 rounded-lg text-[11px] text-rose-200 flex items-start gap-1.5"
              >
                <AlertTriangle className="w-3 h-3 text-rose-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 truncate">
                  <span className="font-semibold">{item.hazard.title}</span>
                  <span className="text-[10px] text-rose-300 ml-1">({item.distanceMeters}m away)</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Periodically checking background GPS for reported high-risk hazards within a 100-meter radius.
          </p>
        )}

        {/* Browser notification permission trigger */}
        <div className="pt-1 border-t border-slate-800 flex items-center justify-between text-[10px]">
          <span className="text-slate-400 flex items-center gap-1">
            <Bell className="w-3 h-3 text-slate-500" />
            Browser Notification:
          </span>
          {notificationPermission === 'granted' ? (
            <span className="text-emerald-400 font-semibold">✓ Active</span>
          ) : notificationPermission === 'denied' ? (
            <span className="text-rose-400">Blocked in browser</span>
          ) : (
            onRequestNotificationPermission && (
              <button
                type="button"
                onClick={onRequestNotificationPermission}
                className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-semibold transition"
              >
                Enable Notifications
              </button>
            )
          )}
        </div>
      </div>

      {/* Demo Simulation Toggle */}
      <div className="pt-1 flex items-center justify-between border-t border-slate-800/80">
        <span className="text-[10px] text-slate-400">Desktop / Evaluation mode:</span>
        <button
          type="button"
          onClick={toggleSimulation}
          className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition ${
            isSimulating
              ? 'bg-amber-600/20 text-amber-300 border-amber-600/40'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
          }`}
        >
          <Footprints className="w-3 h-3 text-amber-400" />
          {isSimulating ? 'Stop Walk Sim' : 'Simulate Walk Motion'}
        </button>
      </div>
    </div>
  );
};
