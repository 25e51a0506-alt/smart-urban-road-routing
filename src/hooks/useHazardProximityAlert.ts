import { useState, useEffect, useRef, useCallback } from 'react';
import { Coordinates, IncidentReport } from '../types';
import { haversineDistance } from '../services/safetyScoring';

export interface NearbyHazardAlert {
  hazard: IncidentReport;
  distanceMeters: number;
  timestamp: number;
}

export interface UseHazardProximityAlertOptions {
  gpsLocation: Coordinates | null;
  reports: IncidentReport[];
  radiusMeters?: number; // default: 100 meters
  checkIntervalMs?: number; // default: 3000 ms
  cooldownMs?: number; // default: 3 minutes (180,000 ms)
  enabled?: boolean;
}

export interface UseHazardProximityAlertReturn {
  nearbyHazards: NearbyHazardAlert[];
  activeAlert: NearbyHazardAlert | null;
  dismissAlert: (hazardId?: string) => void;
  notificationPermission: NotificationPermission | 'unsupported';
  requestNotificationPermission: () => Promise<NotificationPermission | 'unsupported'>;
  isMonitoring: boolean;
  manualCheck: () => void;
}

/**
 * Synthesizes a subtle, non-intrusive safety chime using the Web Audio API.
 */
function playSafetyAlertChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Two-tone warning chirp (880Hz -> 659Hz)
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Ignore audio autoplay restrictions
  }
}

/**
 * Background hook that periodically checks if the user's GPS position
 * approaches any reported high-risk hazards within a 100m radius and
 * triggers a browser notification.
 */
export function useHazardProximityAlert({
  gpsLocation,
  reports,
  radiusMeters = 100,
  checkIntervalMs = 3000,
  cooldownMs = 180000, // 3 minutes cooldown per hazard to avoid spamming
  enabled = true,
}: UseHazardProximityAlertOptions): UseHazardProximityAlertReturn {
  const [nearbyHazards, setNearbyHazards] = useState<NearbyHazardAlert[]>([]);
  const [activeAlert, setActiveAlert] = useState<NearbyHazardAlert | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | 'unsupported'
  >(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  });

  // Track timestamps of when notifications were last dispatched for each hazard
  const lastAlertedMapRef = useRef<Map<string, number>>(new Map());

  // Function to request notification permission from user gesture
  const requestNotificationPermission = useCallback(async (): Promise<
    NotificationPermission | 'unsupported'
  > => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    try {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
      return perm;
    } catch (err) {
      console.warn('Failed to request notification permission:', err);
      return Notification.permission;
    }
  }, []);

  // Dismiss currently showing alert
  const dismissAlert = useCallback((hazardId?: string) => {
    setActiveAlert((current) => {
      if (!hazardId || (current && current.hazard.id === hazardId)) {
        return null;
      }
      return current;
    });
  }, []);

  // Core proximity evaluation function
  const checkProximity = useCallback(() => {
    if (!enabled || !gpsLocation || !reports || reports.length === 0) {
      setNearbyHazards([]);
      return;
    }

    const now = Date.now();
    const highRiskReports = reports.filter(
      (r) => r.severity === 'critical' || r.severity === 'high'
    );

    const detected: NearbyHazardAlert[] = [];

    highRiskReports.forEach((report) => {
      const dist = haversineDistance(gpsLocation, report.coordinates);

      // Check if inside the specified radius (default 100m)
      if (dist <= radiusMeters) {
        detected.push({
          hazard: report,
          distanceMeters: Math.round(dist),
          timestamp: now,
        });

        // Check cooldown to avoid duplicate alert spam
        const lastAlerted = lastAlertedMapRef.current.get(report.id) || 0;
        const shouldAlert = now - lastAlerted > cooldownMs;

        if (shouldAlert) {
          lastAlertedMapRef.current.set(report.id, now);

          // 1. Trigger Web Browser Notification
          if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'granted') {
              try {
                const title = `⚠️ Caution: High-Risk Hazard Nearby (${Math.round(dist)}m)`;
                const body = `"${report.title}" is located ${Math.round(dist)} meters from your live GPS position.\nSeverity: ${report.severity.toUpperCase()}${report.address ? ` • ${report.address}` : ''}`;

                const notification = new Notification(title, {
                  body,
                  icon: '/favicon.ico',
                  tag: `hazard-alert-${report.id}`,
                  requireInteraction: false,
                });

                notification.onclick = () => {
                  window.focus();
                  notification.close();
                };
              } catch (err) {
                console.warn('Browser Notification creation error:', err);
              }
            }
          }

          // 2. Play warning chime
          playSafetyAlertChime();

          // 3. Trigger device vibration if supported
          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            try {
              navigator.vibrate([200, 100, 200]);
            } catch {
              // Ignore vibration failure
            }
          }

          // 4. Update in-app active alert banner
          setActiveAlert({
            hazard: report,
            distanceMeters: Math.round(dist),
            timestamp: now,
          });
        }
      }
    });

    // Sort detected hazards by closest distance
    detected.sort((a, b) => a.distanceMeters - b.distanceMeters);
    setNearbyHazards(detected);
  }, [enabled, gpsLocation, reports, radiusMeters, cooldownMs]);

  // Periodic background check interval
  useEffect(() => {
    if (!enabled) return;

    // Run immediate check whenever location or reports update
    checkProximity();

    // Run periodic interval check in background
    const timerId = setInterval(() => {
      checkProximity();
    }, checkIntervalMs);

    return () => {
      clearInterval(timerId);
    };
  }, [enabled, checkIntervalMs, checkProximity]);

  return {
    nearbyHazards,
    activeAlert,
    dismissAlert,
    notificationPermission,
    requestNotificationPermission,
    isMonitoring: Boolean(enabled && gpsLocation),
    manualCheck: checkProximity,
  };
}
