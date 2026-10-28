import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Coordinates, IncidentReport, RouteOption } from './types';
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Download,
  Clock,
  ShieldCheck,
  AlertTriangle,
  X,
  Sparkles,
  Check,
  Navigation,
  Compass,
} from 'lucide-react';
import { downloadRouteGeoJSON } from './services/geoJsonExport';

interface MapProps {
  center: Coordinates;
  zoom: number;
  gpsLocation: Coordinates | null;
  gpsAccuracy: number | null;
  reports: IncidentReport[];
  routes: RouteOption[];
  selectedRouteIndex: number;
  showHazards: boolean;
  showBuffers: boolean;
  onMapClick?: (coords: Coordinates) => void;
  onSelectRoute?: (index: number) => void;
  onSelectReport?: (report: IncidentReport) => void;
  onConfirmReport?: (reportId: string) => void;
  pinnedTempCoords?: Coordinates | null;
  activeTab?: string;
  isSidebarOpen?: boolean;
}

export const MapComponent: React.FC<MapProps> = ({
  center,
  zoom,
  gpsLocation,
  gpsAccuracy,
  reports,
  routes,
  selectedRouteIndex,
  showHazards,
  showBuffers,
  onMapClick,
  onSelectRoute,
  onSelectReport,
  onConfirmReport,
  pinnedTempCoords,
  activeTab,
  isSidebarOpen,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);
  const [tileErrorCount, setTileErrorCount] = useState<number>(0);

  // Touch gesture states
  const [liveZoom, setLiveZoom] = useState<number>(zoom);
  const [isZooming, setIsZooming] = useState<boolean>(false);
  const [isCardDismissed, setIsCardDismissed] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [exportToast, setExportToast] = useState<string | null>(null);

  const touchStartYRef = useRef<number>(0);
  const touchStartXRef = useRef<number>(0);
  const touchStartTimeRef = useRef<number>(0);

  // Reset dismissed state when routes change or new route is selected
  useEffect(() => {
    setIsCardDismissed(false);
    setDragOffset({ x: 0, y: 0 });
  }, [routes, selectedRouteIndex]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Create Leaflet map with refined pinch-to-zoom & inertial touch physics
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: true,
      zoomSnap: 0.25,          // Fractional zoom for fluid, buttery-smooth pinch gestures
      zoomDelta: 0.5,          // Smaller, smoother zoom increments
      wheelPxPerZoomLevel: 100,// Smoother wheel/trackpad pinch response
      touchZoom: true,         // Multi-touch pinch-to-zoom enabled
      bounceAtZoomLimits: true,// Natural rubber-banding bounce when reaching max/min zoom
      inertia: true,           // Inertial momentum panning
      inertiaDeceleration: 3000,// Natural deceleration rate on touch flick
      inertiaMaxSpeed: 1800,   // High responsive speed for quick flicks
      easeLinearity: 0.2,      // Smooth easing curve
      tapTolerance: 15,        // Prevents finger twitches from triggering clicks
      doubleClickZoom: true,   // Double-tap to zoom smoothly
    }).setView(center, zoom);

    // Track live pinch zoom for tactile visual scale feedback
    map.on('zoomstart', () => setIsZooming(true));
    map.on('zoom', () => setLiveZoom(map.getZoom()));
    map.on('zoomend', () => {
      setLiveZoom(map.getZoom());
      setTimeout(() => setIsZooming(false), 800);
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    layersGroupRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    // Click handler for pinning coordinates
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onMapClick) {
        onMapClick([e.latlng.lat, e.latlng.lng]);
      }
    });

    // Make confirm action available for popup buttons
    (window as any).__confirmReport = (id: string) => {
      if (onConfirmReport) onConfirmReport(id);
    };

    // Ensure initial layout computes immediately
    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    // ResizeObserver to automatically resize map whenever container dimensions change
    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });

    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Call mapInstanceRef.current.invalidateSize() whenever the sidebar state changes in the parent component
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.invalidateSize();
      const timeoutId = setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [isSidebarOpen]);

  // Invalidate map size when tab visibility changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.invalidateSize();
    }
  }, [activeTab]);

  // Sync Center and Zoom
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(center, zoom, { animate: true });
    }
  }, [center, zoom]);

  // Redraw Polylines, GPS, Hazard Pins
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = layersGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    // 1. Draw Routes (Draw unselected routes first, then selected route on top)
    if (routes.length > 0) {
      const ROUTE_PALETTE = ['#2563eb', '#8b5cf6', '#06b6d4', '#f59e0b'];
      
      // Sort indices so unselected are drawn first, and selectedRouteIndex is drawn last on top
      const sortedIndices = routes
        .map((_, i) => i)
        .sort((a, b) => {
          if (a === selectedRouteIndex) return 1;
          if (b === selectedRouteIndex) return -1;
          return 0;
        });

      sortedIndices.forEach((idx) => {
        const route = routes[idx];
        const isSelected = idx === selectedRouteIndex;
        const score = route.safetyAnalysis.score;
        const baseColor = route.color || ROUTE_PALETTE[idx % ROUTE_PALETTE.length];

        // Draw polyline with distinct color for each route
        const polyline = L.polyline(route.geometry, {
          color: isSelected ? (score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444') : baseColor,
          weight: isSelected ? 8 : 5,
          opacity: isSelected ? 1.0 : 0.65,
          dashArray: isSelected ? undefined : '5, 7',
        });

        polyline.on('click', () => {
          if (onSelectRoute) onSelectRoute(idx);
        });

        const badges = [];
        if (route.isRecommended) badges.push('★ Safest Recommended');
        if (route.isShortest) badges.push('⚡ Shortest');

        polyline.bindTooltip(
          `<b>${route.name}</b>${badges.length ? `<br/><span style="color:#60a5fa">${badges.join(' • ')}</span>` : ''}<br/>Safety: ${score}/100 • ${route.distanceKm} km • ${route.durationMin} min<br/><i style="font-size:10px; color:#94a3b8">Click to select this route</i>`,
          { sticky: true }
        );

        group.addLayer(polyline);

        // Add start and end pins for the selected route
        if (isSelected && route.geometry.length > 1) {
          const startPt = route.geometry[0];
          const endPt = route.geometry[route.geometry.length - 1];

          // Start marker (Green pin with letter A)
          const startIcon = L.divIcon({
            className: 'start-marker-icon',
            html: `
              <div class="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs shadow-lg border-2 border-white">
                A
              </div>
            `,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });
          group.addLayer(L.marker(startPt, { icon: startIcon }).bindTooltip('Starting Point'));

          // End marker (Rose pin with letter B)
          const endIcon = L.divIcon({
            className: 'end-marker-icon',
            html: `
              <div class="flex items-center justify-center w-7 h-7 rounded-full bg-rose-600 text-white font-bold text-xs shadow-lg border-2 border-white">
                B
              </div>
            `,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });
          group.addLayer(L.marker(endPt, { icon: endIcon }).bindTooltip('Destination Point'));

          // Fit map view to route bounds
          map.fitBounds(polyline.getBounds(), { padding: [60, 60], maxZoom: 16 });
        }
      });
    }

    // 2. Incident Hazard Markers
    if (showHazards) {
      reports.forEach((report) => {
        const severityBg =
          report.severity === 'critical' ? '#dc2626' :
          report.severity === 'high' ? '#ea580c' :
          report.severity === 'medium' ? '#d97706' : '#2563eb';

        const isUrgent = report.severity === 'critical' || report.severity === 'high';

        // 250m Proximity buffer halo
        if (showBuffers) {
          const bufferRadius = report.severity === 'critical' ? 300 : report.severity === 'high' ? 220 : 150;
          const bufferCircle = L.circle(report.coordinates, {
            radius: bufferRadius,
            color: severityBg,
            fillColor: severityBg,
            fillOpacity: 0.12,
            weight: 1,
            dashArray: '3, 4',
          });
          group.addLayer(bufferCircle);
        }

        const iconHtml = `
          <div class="relative flex items-center justify-center w-8 h-8 cursor-pointer group">
            ${isUrgent ? `<div class="absolute inset-0 rounded-full hazard-pulse-ring" style="background-color: ${severityBg};"></div>` : ''}
            <div style="background-color: ${severityBg};" class="relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-white shadow-xl border-2 border-white transform transition hover:scale-125">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
          </div>
        `;

        const customIcon = L.divIcon({
          className: 'hazard-icon',
          html: iconHtml,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker(report.coordinates, { icon: customIcon });

        marker.on('click', () => {
          if (onSelectReport) onSelectReport(report);
        });

        const lightingBadge =
          report.lightingCondition === 'pitch_black' ? '<span style="color:#f87171;">🌑 Pitch Black</span>' :
          report.lightingCondition === 'poor' ? '<span style="color:#fbbf24;">🌘 Poor Lighting</span>' :
          report.lightingCondition === 'well_lit' ? '<span style="color:#34d399;">💡 Well Lit</span>' :
          report.lightingCondition === 'moderate' ? '<span style="color:#60a5fa;">🌗 Moderate Visibility</span>' :
          '<span style="color:#94a3b8;">Lighting data unavailable</span>';

        const popupHtml = `
          <div style="font-family: inherit; min-width: 210px; max-width: 260px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
              <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: ${severityBg}; background: rgba(255,255,255,0.08); padding: 2px 6px; border-radius: 4px;">
                ${report.category.replace('_', ' ')} • ${report.severity}
              </span>
              <span style="font-size: 10px; color: #94a3b8;">${new Date(report.reportedAt).toLocaleDateString()}</span>
            </div>
            <h4 style="font-weight: 700; font-size: 13px; color: #f8fafc; margin: 4px 0 2px 0;">${report.title}</h4>
            <p style="font-size: 11px; color: #cbd5e1; margin: 0 0 6px 0; line-height: 1.35;">${report.description}</p>
            <div style="font-size: 10px; margin-bottom: 6px;">
              <strong>Lighting:</strong> ${lightingBadge}
            </div>
            ${report.photoUrl ? `<img src="${report.photoUrl}" style="width: 100%; height: 80px; object-fit: cover; border-radius: 6px; margin-bottom: 6px; border: 1px solid rgba(255,255,255,0.1);" alt="Evidence"/>` : ''}
            <div style="display: flex; align-items: center; justify-content: space-between; font-size: 10px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 6px;">
              <span style="color: #94a3b8;">By: ${report.reportedBy}</span>
              <button onclick="window.__confirmReport('${report.id}')" style="background: #2563eb; color: white; border: none; padding: 2px 8px; border-radius: 4px; font-size: 10px; cursor: pointer; font-weight: 600;">
                👍 Confirm (${report.confirmations || 0})
              </button>
            </div>
          </div>
        `;

        marker.bindPopup(popupHtml);
        group.addLayer(marker);
      });
    }

    // 3. User Pinned Temporary Click Marker
    if (pinnedTempCoords) {
      const pinIcon = L.divIcon({
        className: 'temp-pin-icon',
        html: `
          <div class="relative flex items-center justify-center w-8 h-8">
            <div class="absolute -top-3 w-6 h-6 bg-blue-500 rounded-full border-2 border-white shadow-xl flex items-center justify-center text-white text-xs font-bold animate-bounce">
              📍
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 28],
      });
      const tempMarker = L.marker(pinnedTempCoords, { icon: pinIcon })
        .bindTooltip('Pinned location for reporting', { permanent: true, direction: 'top', offset: [0, -20] });
      group.addLayer(tempMarker);
    }

    // 4. Live GPS Marker
    if (gpsLocation) {
      const gpsIcon = L.divIcon({
        className: 'gps-marker-icon',
        html: `
          <div class="relative flex items-center justify-center w-8 h-8">
            <div class="absolute w-8 h-8 bg-blue-500 rounded-full gps-pulse"></div>
            <div class="relative w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-xl"></div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const gpsMarker = L.marker(gpsLocation, { icon: gpsIcon }).bindTooltip('Your Live Position', { direction: 'top' });
      group.addLayer(gpsMarker);

      if (gpsAccuracy && gpsAccuracy > 0) {
        const accuracyCircle = L.circle(gpsLocation, {
          radius: gpsAccuracy,
          color: '#3b82f6',
          fillColor: '#60a5fa',
          fillOpacity: 0.15,
          weight: 1.5,
          dashArray: '2, 4',
        });
        group.addLayer(accuracyCircle);
      }
    }
  }, [
    routes,
    selectedRouteIndex,
    reports,
    gpsLocation,
    gpsAccuracy,
    showHazards,
    showBuffers,
    pinnedTempCoords,
  ]);

  // Swipe gesture handlers for Route Information Card
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    touchStartYRef.current = touch.clientY;
    touchStartXRef.current = touch.clientX;
    touchStartTimeRef.current = Date.now();
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const deltaY = touch.clientY - touchStartYRef.current;
    const deltaX = touch.clientX - touchStartXRef.current;

    // Downward swipe for dismiss with dampening; slight dampening for upward pull
    if (deltaY > 0) {
      setDragOffset({ x: deltaX * 0.25, y: deltaY });
    } else {
      setDragOffset({ x: deltaX * 0.25, y: deltaY * 0.25 });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    const deltaY = dragOffset.y;
    const deltaX = (touchStartXRef.current !== 0 && e.changedTouches.length > 0)
      ? e.changedTouches[0].clientX - touchStartXRef.current
      : 0;
    const elapsed = Date.now() - touchStartTimeRef.current;
    const velocityY = deltaY / (elapsed || 1);

    // Swipe down to dismiss threshold (60px downward pull or fast downward flick)
    if (deltaY > 60 || velocityY > 0.35) {
      setIsCardDismissed(true);
      setDragOffset({ x: 0, y: 0 });
      return;
    }

    // Horizontal swipe to cycle alternative routes (if multiple routes exist)
    if (routes.length > 1 && Math.abs(deltaX) > 75) {
      if (deltaX < -75 && selectedRouteIndex < routes.length - 1) {
        onSelectRoute?.(selectedRouteIndex + 1);
      } else if (deltaX > 75 && selectedRouteIndex > 0) {
        onSelectRoute?.(selectedRouteIndex - 1);
      }
    }

    // Reset offset with spring animation
    setDragOffset({ x: 0, y: 0 });
  };

  const currentRoute = routes[selectedRouteIndex] || routes[0];

  const handleExportCurrentRoute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentRoute) return;
    try {
      const fileName = downloadRouteGeoJSON(currentRoute);
      setExportToast(`Saved ${fileName}`);
      setTimeout(() => setExportToast(null), 3000);
    } catch (err) {
      console.error('Failed to export route:', err);
    }
  };

  return (
    <div className="w-full h-full relative z-0 flex flex-col overflow-hidden">
      {/* Map tile error notification banner */}
      {tileErrorCount > 5 && (
        <div className="absolute top-2 left-2 right-2 z-[1000] bg-rose-950/90 border border-rose-700 text-rose-200 text-xs px-3 py-1.5 rounded-lg shadow-lg flex items-center justify-between">
          <span>Some OpenStreetMap tiles could not be fetched. Please check your internet connection.</span>
          <button
            onClick={() => setTileErrorCount(0)}
            className="text-rose-400 hover:text-white font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Refined Pinch-to-Zoom Scale Indicator */}
      {isZooming && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-blue-500/60 text-xs font-mono text-blue-300 shadow-2xl flex items-center gap-2 pointer-events-none animate-fade-in">
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
          <span>Zoom: <strong className="text-white">{liveZoom.toFixed(2)}x</strong> (0.25x fluid pinch)</span>
        </div>
      )}

      {/* Quick Export Toast Notification */}
      {exportToast && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[1100] bg-emerald-950/95 border border-emerald-700 text-emerald-200 px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 shadow-2xl animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span className="truncate max-w-[260px]">{exportToast}!</span>
        </div>
      )}

      {/* Mobile-Optimized Route Information Card with Swipe-to-Dismiss */}
      {routes.length > 0 && currentRoute && !isCardDismissed && (
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            transform: `translate3d(${dragOffset.x}px, ${Math.max(0, dragOffset.y)}px, 0)`,
            opacity: isDragging ? Math.max(0.35, 1 - dragOffset.y / 240) : 1,
            transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease',
          }}
          className="absolute bottom-4 left-3 right-3 sm:left-4 sm:right-auto sm:w-96 z-[1000] bg-slate-900/95 border border-slate-700/90 rounded-2xl p-3.5 shadow-2xl backdrop-blur-md text-white select-none animate-fade-in touch-pan-y"
        >
          {/* Swipe-to-Dismiss Drag Handle */}
          <div className="w-full flex flex-col items-center pb-1.5 cursor-grab active:cursor-grabbing">
            <div className="w-12 h-1.5 bg-slate-600 rounded-full hover:bg-slate-500 transition" />
            <div className="flex items-center gap-1 text-[9px] text-slate-400 mt-1">
              <ChevronDown className="w-3 h-3 text-slate-400 animate-bounce" />
              <span>Swipe down to dismiss</span>
              {routes.length > 1 && (
                <span>• Swipe sides to switch ({selectedRouteIndex + 1}/{routes.length})</span>
              )}
            </div>
          </div>

          {/* Route Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0 border border-white/60 shadow-sm"
                  style={{ backgroundColor: currentRoute.color || '#2563eb' }}
                />
                <h4 className="font-bold text-xs text-white leading-tight">
                  {currentRoute.name}
                </h4>
              </div>

              {/* Badges */}
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {currentRoute.isRecommended && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                    ★ Safest Recommended
                  </span>
                )}
                {currentRoute.isShortest && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-950 text-blue-300 border border-blue-700">
                    ⚡ Shortest
                  </span>
                )}
                {currentRoute.provider && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-indigo-950 text-indigo-300 border border-indigo-700">
                    {currentRoute.provider === 'graphhopper' ? 'GraphHopper' : 'OSRM'}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <div className={`px-2 py-1 rounded-lg text-xs font-bold border ${
                currentRoute.safetyAnalysis.score >= 75
                  ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                  : currentRoute.safetyAnalysis.score >= 50
                  ? 'bg-amber-950/80 text-amber-400 border-amber-800'
                  : 'bg-rose-950/80 text-rose-400 border-rose-800'
              }`}>
                Safety {currentRoute.safetyAnalysis.score}/100
              </div>
              <button
                type="button"
                onClick={() => setIsCardDismissed(true)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                title="Dismiss card (or swipe down)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-1.5 py-2 border-y border-slate-800 text-[11px] text-slate-300">
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
              <span>{currentRoute.durationMin} min</span>
            </div>
            <div>
              <span className="text-slate-400">Dist:</span>{' '}
              <span className="font-semibold">{currentRoute.distanceKm} km</span>
            </div>
            <div className="truncate text-right">
              <span className="text-slate-400">{currentRoute.geometry.length} pts</span>
            </div>
          </div>

          {/* Safety & Lighting summary */}
          <div className="pt-2 text-[10px] flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1 text-slate-400">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span className="truncate max-w-[170px]">{currentRoute.safetyAnalysis.lightingAssessment}</span>
            </span>

            {currentRoute.safetyAnalysis.hazardsEncountered > 0 ? (
              <span className="text-amber-400 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {currentRoute.safetyAnalysis.hazardsEncountered} hazard(s)
              </span>
            ) : (
              <span className="text-emerald-400 font-medium">✓ Safe corridor</span>
            )}
          </div>

          {/* Actions: Export GeoJSON & Route Pagination if multiple */}
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleExportCurrentRoute}
              className="py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow flex items-center gap-1.5 transition active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export GeoJSON</span>
            </button>

            {routes.length > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={selectedRouteIndex === 0}
                  onClick={() => onSelectRoute?.(selectedRouteIndex - 1)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  title="Previous route alternative"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] text-slate-400 font-mono px-1">
                  {selectedRouteIndex + 1}/{routes.length}
                </span>
                <button
                  type="button"
                  disabled={selectedRouteIndex === routes.length - 1}
                  onClick={() => onSelectRoute?.(selectedRouteIndex + 1)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  title="Next route alternative"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Minimized Floating Route Pill (re-expandable via tap or swipe-up) */}
      {routes.length > 0 && currentRoute && isCardDismissed && (
        <button
          type="button"
          onClick={() => setIsCardDismissed(false)}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900/95 hover:bg-slate-800 text-white px-3.5 py-2 rounded-2xl shadow-2xl border border-blue-500/60 flex items-center gap-2 text-xs font-semibold backdrop-blur-md transition active:scale-95 animate-fade-in group"
          title="Tap or swipe up to view route information card"
        >
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm"
            style={{ backgroundColor: currentRoute.color || '#2563eb' }}
          />
          <span className="truncate max-w-[180px] sm:max-w-none">{currentRoute.name}</span>
          <span className="text-[10px] bg-slate-800 text-blue-300 px-1.5 py-0.5 rounded font-mono">
            {currentRoute.durationMin}m • {currentRoute.safetyAnalysis.score}/100
          </span>
          <ChevronUp className="w-4 h-4 text-blue-400 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      )}

      {/* Main Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[300px] flex-1" />
    </div>
  );
};
