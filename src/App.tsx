import React, { useState, useRef } from 'react';
import { Coordinates, IncidentReport, RouteOption, UserProfile } from './types';
import {
  getSavedReports,
  saveReport,
  upvoteReport,
  getStoredUser,
  setStoredUser,
  DEMO_PRESETS,
  DemoPreset,
  getActivePresetId,
  setActivePresetId,
} from './services/storage';
import { fetchGraphHopperRoute, fetchOSRMRoute, checkGraphHopperStatus } from './services/api';
import { calculateRouteSafety } from './services/safetyScoring';
import { MapComponent } from './MapComponent';
import { Navbar } from './Navbar';
import { RoutePlanner } from './RoutePlanner';
import { LiveTracker } from './LiveTracker';
import { ReportsFeed } from './ReportsFeed';
import { ReportModal } from './ReportModal';
import { AuthModal } from './AuthModal';
import { SafetyMethodologyModal } from './SafetyMethodologyModal';
import { EmergencyModal } from './EmergencyModal';
import {
  AlertTriangle,
  Navigation,
  Compass,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Sparkles,
  Download,
  Check,
  Bell,
  BellRing,
  X,
} from 'lucide-react';
import { downloadRouteGeoJSON } from './services/geoJsonExport';
import { useHazardProximityAlert } from './hooks/useHazardProximityAlert';
export { useHazardProximityAlert } from './hooks/useHazardProximityAlert';

export default function App() {
  const [activePresetIdState, setActivePresetIdState] = useState<string>(getActivePresetId);
  const activePreset = DEMO_PRESETS.find((p) => p.id === activePresetIdState) || DEMO_PRESETS[0];

  const [center, setCenter] = useState<Coordinates>(activePreset.center);
  const [zoom, setZoom] = useState<number>(activePreset.zoom);
  const [showHazards, setShowHazards] = useState<boolean>(true);
  const [showBuffers, setShowBuffers] = useState<boolean>(true);
  const [pinnedTempCoords, setPinnedTempCoords] = useState<Coordinates | null>(null);

  const [reports, setReports] = useState<IncidentReport[]>(getSavedReports);
  const [user, setUser] = useState<UserProfile | null>(getStoredUser);

  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number>(0);
  const [routingLoading, setRoutingLoading] = useState(false);
  const [routingError, setRoutingError] = useState<string | null>(null);
  const [routeMode, setRouteMode] = useState<'driving' | 'walking'>('driving');
  const lastEndpointsRef = useRef<{ start: Coordinates; end: Coordinates; mode: 'driving' | 'walking' } | null>(null);

  const [gpsLocation, setGpsLocation] = useState<Coordinates | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [isTrackingGps, setIsTrackingGps] = useState(false);

  const [activeTab, setActiveTab] = useState<'routes' | 'gps' | 'feed'>('routes');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMethodologyOpen, setIsMethodologyOpen] = useState(false);
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);
  const [mapExportSuccess, setMapExportSuccess] = useState<string | null>(null);

  // Background hook that periodically checks if user's GPS approaches any high-risk hazards within 100m
  const {
    nearbyHazards,
    activeAlert,
    dismissAlert,
    notificationPermission,
    requestNotificationPermission,
  } = useHazardProximityAlert({
    gpsLocation,
    reports,
    radiusMeters: 100, // 100m proximity threshold
    checkIntervalMs: 3000, // Periodic check every 3 seconds
    cooldownMs: 180000, // 3-minute cooldown per hazard
    enabled: true,
  });

  const handleSelectPreset = (preset: DemoPreset) => {
    setActivePresetIdState(preset.id);
    setActivePresetId(preset.id);
    setCenter(preset.center);
    setZoom(preset.zoom);
    setRoutes([]);
    setRoutingError(null);
    setPinnedTempCoords(null);
  };

  const handleCalculateRoute = async (
    start: Coordinates,
    end: Coordinates,
    mode: 'driving' | 'walking' = 'driving'
  ) => {
    setRoutingLoading(true);
    setRoutingError(null);
    setRouteMode(mode);
    lastEndpointsRef.current = { start, end, mode };
    try {
      const calculatedRoutes = await fetchGraphHopperRoute(start, end, reports, mode);
      setRoutes(calculatedRoutes);
      setSelectedRouteIndex(0);
      setCenter(start);
    } catch (err: any) {
      console.error('GraphHopper route calculation error:', err);
      setRoutingError(err.message || 'Error communicating with GraphHopper Directions API.');
    } finally {
      setRoutingLoading(false);
    }
  };

  const handleFallbackOSRM = async () => {
    if (!lastEndpointsRef.current) return;
    setRoutingLoading(true);
    setRoutingError(null);
    try {
      const calculatedRoutes = await fetchOSRMRoute(
        lastEndpointsRef.current.start,
        lastEndpointsRef.current.end,
        reports,
        lastEndpointsRef.current.mode
      );
      setRoutes(calculatedRoutes);
      setSelectedRouteIndex(0);
      setCenter(lastEndpointsRef.current.start);
    } catch (err: any) {
      setRoutingError(err.message || 'Error calculating fallback routes.');
    } finally {
      setRoutingLoading(false);
    }
  };

  const handleQuickDemoRoute = () => {
    handleCalculateRoute(
      activePreset.defaultOrigin.coords,
      activePreset.defaultDestination.coords,
      routeMode
    );
  };

  const handleMapClick = (coords: Coordinates) => {
    setPinnedTempCoords(coords);
  };

  const handleOpenReportWithCoords = (coords?: Coordinates) => {
    const target = coords || pinnedTempCoords || gpsLocation || center;
    setPinnedTempCoords(target);
    setIsReportModalOpen(true);
  };

  const handleNewReport = (newReport: IncidentReport) => {
    saveReport(newReport);
    const updated = getSavedReports();
    setReports(updated);
    setPinnedTempCoords(null);
    setCenter(newReport.coordinates);

    if (routes.length > 0) {
      // Re-evaluate safety analysis on existing real geometries without losing alternative corridors
      const updatedRoutes = routes.map((r) => {
        const safetyAnalysis = calculateRouteSafety(r.geometry, updated);
        return {
          ...r,
          safetyScore: safetyAnalysis.score,
          safetyAnalysis,
        };
      });
      const highestScore = Math.max(...updatedRoutes.map((r) => r.safetyScore));
      setRoutes(
        updatedRoutes.map((r) => ({
          ...r,
          isRecommended: r.safetyScore === highestScore && updatedRoutes.length > 1,
        }))
      );
    }
  };

  const handleConfirmReport = (reportId: string) => {
    upvoteReport(reportId);
    const updated = getSavedReports();
    setReports(updated);
    if (routes.length > 0) {
      const updatedRoutes = routes.map((r) => {
        const safetyAnalysis = calculateRouteSafety(r.geometry, updated);
        return {
          ...r,
          safetyScore: safetyAnalysis.score,
          safetyAnalysis,
        };
      });
      const highestScore = Math.max(...updatedRoutes.map((r) => r.safetyScore));
      setRoutes(
        updatedRoutes.map((r) => ({
          ...r,
          isRecommended: r.safetyScore === highestScore && updatedRoutes.length > 1,
        }))
      );
    }
  };

  const handleSelectReport = (report: IncidentReport) => {
    setCenter(report.coordinates);
    setZoom(16);
  };

  const handleCenterOnUser = () => {
    if (gpsLocation) {
      setCenter(gpsLocation);
      setZoom(16);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden select-none font-sans">
      <Navbar
        user={user}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={() => {
          setStoredUser(null);
          setUser(null);
        }}
        onOpenReportModal={() => handleOpenReportWithCoords()}
        onOpenEmergencyModal={() => setIsEmergencyOpen(true)}
        onOpenMethodology={() => setIsMethodologyOpen(true)}
        activePresetId={activePresetIdState}
        onSelectPreset={handleSelectPreset}
        showHazards={showHazards}
        onToggleHazards={() => setShowHazards(!showHazards)}
        showBuffers={showBuffers}
        onToggleBuffers={() => setShowBuffers(!showBuffers)}
      />

      <div className="bg-amber-950/70 border-b border-amber-800/60 px-4 py-1.5 flex items-center justify-between text-[11px] text-amber-200 z-20">
        <div className="flex items-center gap-2 overflow-hidden">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <span className="truncate">
            <strong>Advisory Notice:</strong> Safety scores are mathematical estimates based on crowdsourced community reports & lighting. Not official crime statistics or an absolute guarantee.
          </span>
        </div>
        <button
          onClick={() => setIsMethodologyOpen(true)}
          className="text-[10px] text-amber-300 underline font-semibold hover:text-white flex-shrink-0 ml-2"
        >
          View Scoring Formulation
        </button>
      </div>

      <div className="flex-1 flex relative overflow-hidden">
        <div
          className={`absolute md:relative z-20 top-0 bottom-0 left-0 transition-all duration-300 flex flex-col ${
            isSidebarOpen ? 'w-full sm:w-[410px] translate-x-0' : '-translate-x-full md:w-0'
          }`}
        >
          <div className="h-full bg-slate-900/95 backdrop-blur-md border-r border-slate-800 flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center bg-slate-950 p-1.5 border-b border-slate-800 gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('routes')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-semibold transition ${
                  activeTab === 'routes'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Routes</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('gps')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-semibold transition ${
                  activeTab === 'gps'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Live GPS</span>
                {isTrackingGps && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('feed')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-semibold transition ${
                  activeTab === 'feed'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Hazards</span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded-full">
                  {reports.length}
                </span>
              </button>
            </div>

            <div className="bg-slate-950/60 px-3 py-2 border-b border-slate-800 flex items-center justify-between text-xs">
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Preset: <strong>{activePreset.city}</strong></span>
              </span>
              <button
                type="button"
                onClick={handleQuickDemoRoute}
                disabled={routingLoading}
                className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 bg-blue-950/60 hover:bg-blue-900/60 border border-blue-800 px-2 py-1 rounded-lg transition"
              >
                <RefreshCw className={`w-3 h-3 ${routingLoading ? 'animate-spin' : ''}`} />
                <span>Test Preset Route</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {activeTab === 'routes' && (
                <RoutePlanner
                  onCalculateRoute={handleCalculateRoute}
                  routes={routes}
                  selectedRouteIndex={selectedRouteIndex}
                  onSelectRoute={(idx) => setSelectedRouteIndex(idx)}
                  currentGps={gpsLocation}
                  loading={routingLoading}
                  routingError={routingError}
                  onRetry={() => {
                    if (lastEndpointsRef.current) {
                      handleCalculateRoute(
                        lastEndpointsRef.current.start,
                        lastEndpointsRef.current.end,
                        lastEndpointsRef.current.mode
                      );
                    } else {
                      handleQuickDemoRoute();
                    }
                  }}
                  onOpenMethodology={() => setIsMethodologyOpen(true)}
                  initialOrigin={activePreset.defaultOrigin}
                  initialDestination={activePreset.defaultDestination}
                  onFallbackOSRM={handleFallbackOSRM}
                />
              )}

              {activeTab === 'gps' && (
                <div className="space-y-3">
                  <LiveTracker
                    onLocationUpdate={(coords, acc) => {
                      setGpsLocation(coords);
                      setGpsAccuracy(acc);
                    }}
                    onTrackingStateChange={(tracking) => setIsTrackingGps(tracking)}
                    onCenterOnUser={handleCenterOnUser}
                    currentCoords={gpsLocation}
                    accuracy={gpsAccuracy}
                    nearbyHazards={nearbyHazards}
                    notificationPermission={notificationPermission}
                    onRequestNotificationPermission={requestNotificationPermission}
                  />

                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl text-xs space-y-2">
                    <h4 className="font-bold text-white text-xs">Active Geofence Advisory</h4>
                    <p className="text-[11px] text-slate-400">
                      The safety navigation engine monitors a 250m perimeter around your live position. If you approach any
                      corridor with reported harassment or broken streetlights, proximity alerts are raised automatically.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'feed' && (
                <ReportsFeed
                  reports={reports}
                  onSelectReport={handleSelectReport}
                  onConfirmReport={handleConfirmReport}
                  onOpenReportModal={() => handleOpenReportWithCoords()}
                />
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`absolute top-4 z-30 p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 shadow-xl transition hidden md:block ${
            isSidebarOpen ? 'left-[418px]' : 'left-4'
          }`}
          title={isSidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
        >
          {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        <div className="flex-1 h-full relative">
          <MapComponent
            center={center}
            zoom={zoom}
            gpsLocation={gpsLocation}
            gpsAccuracy={gpsAccuracy}
            reports={reports}
            routes={routes}
            selectedRouteIndex={selectedRouteIndex}
            showHazards={showHazards}
            showBuffers={showBuffers}
            onMapClick={handleMapClick}
            onSelectRoute={(idx) => setSelectedRouteIndex(idx)}
            onSelectReport={handleSelectReport}
            onConfirmReport={handleConfirmReport}
            pinnedTempCoords={pinnedTempCoords}
            activeTab={activeTab}
            isSidebarOpen={isSidebarOpen}
          />

          {routes.length > 0 && routes[selectedRouteIndex] && (
            <div className="absolute top-4 left-4 z-[1000] flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  try {
                    const sel = routes[selectedRouteIndex];
                    const fn = downloadRouteGeoJSON(sel, {
                      originLabel: activePreset.name,
                      destLabel: 'Navigation Route',
                    });
                    setMapExportSuccess(`Saved ${fn}`);
                    setTimeout(() => setMapExportSuccess(null), 3000);
                  } catch (e) {
                    console.error('Export error:', e);
                  }
                }}
                className="bg-slate-900/95 hover:bg-slate-800 text-white border border-slate-700/80 px-3 py-1.5 rounded-xl shadow-xl backdrop-blur-md text-xs font-semibold flex items-center gap-2 transition active:scale-95 group"
                title="Export selected route coordinates as GeoJSON file"
              >
                <Download className="w-3.5 h-3.5 text-blue-400 group-hover:translate-y-0.5 transition-transform" />
                <span>Export Route (.geojson)</span>
              </button>

              {mapExportSuccess && (
                <div className="bg-emerald-950/95 border border-emerald-700 text-emerald-200 px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-lg animate-fade-in">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="truncate max-w-[200px]">{mapExportSuccess}</span>
                </div>
              )}
            </div>
          )}

          {/* Live Proximity Hazard Alert Warning Banner */}
          {activeAlert && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1100] w-[92%] max-w-lg bg-rose-950/95 border-2 border-rose-500 shadow-2xl rounded-2xl p-3.5 backdrop-blur-md animate-fade-in text-white">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="p-2 bg-rose-600 text-white rounded-xl flex-shrink-0 animate-pulse">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-600 text-white px-2 py-0.5 rounded-full">
                        PROXIMITY WARNING • {activeAlert.distanceMeters}m
                      </span>
                      <span className="text-[10px] font-mono text-rose-300 font-bold">
                        {activeAlert.hazard.severity.toUpperCase()} RISK
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-white mt-1 leading-snug">
                      {activeAlert.hazard.title}
                    </h4>
                    <p className="text-[11px] text-rose-200/90 mt-0.5 line-clamp-2">
                      {activeAlert.hazard.description}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => dismissAlert(activeAlert.hazard.id)}
                  className="text-rose-300 hover:text-white p-1 rounded-lg hover:bg-rose-900 transition flex-shrink-0"
                  title="Dismiss alert"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-rose-800/80 text-[11px]">
                <span className="text-rose-300">
                  Approached within 100m of reported hazard
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCenter(activeAlert.hazard.coordinates);
                      setZoom(16);
                    }}
                    className="font-semibold px-2.5 py-1 bg-rose-800 hover:bg-rose-700 text-white rounded-lg transition"
                  >
                    View on Map
                  </button>
                  <button
                    type="button"
                    onClick={() => dismissAlert(activeAlert.hazard.id)}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg transition"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}

          {pinnedTempCoords ? (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900/95 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-2xl border border-blue-500/80 flex items-center gap-3 animate-fade-in">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
              <div className="text-xs">
                <span className="font-bold text-white">Location Pinned:</span>{' '}
                <span className="font-mono text-slate-300">
                  {pinnedTempCoords[0].toFixed(4)}, {pinnedTempCoords[1].toFixed(4)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleOpenReportWithCoords(pinnedTempCoords)}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs rounded-xl shadow transition"
              >
                File Hazard Here
              </button>
              <button
                type="button"
                onClick={() => setPinnedTempCoords(null)}
                className="text-slate-400 hover:text-white text-xs px-1"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="absolute top-4 right-4 z-[1000] flex items-center gap-2">
              {notificationPermission === 'default' && (
                <button
                  type="button"
                  onClick={requestNotificationPermission}
                  className="bg-slate-900/95 hover:bg-slate-800 text-amber-300 hover:text-white border border-amber-500/50 px-3 py-1.5 rounded-xl shadow-xl backdrop-blur-md text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 animate-fade-in"
                  title="Enable browser notifications for hazard proximity alerts"
                >
                  <Bell className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span>Enable Proximity Alerts</span>
                </button>
              )}
              <div className="bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-lg border border-slate-800 text-[11px] text-slate-300 hidden sm:flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span>Click any spot on map to pin & report a hazard</span>
              </div>
            </div>
          )}

          <div className="md:hidden absolute bottom-4 left-4 right-4 z-[1000]">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="w-full py-3 px-4 bg-slate-900/95 backdrop-blur-md border border-slate-700 text-white font-bold text-xs rounded-2xl shadow-2xl flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-blue-400" />
                <span>{isSidebarOpen ? 'Hide Navigation Panel' : 'Show Route & GPS Controls'}</span>
              </span>
              <span className="text-[10px] bg-blue-600 px-2 py-0.5 rounded-md">
                {routes.length > 0 ? `${routes.length} Routes` : 'Plan Route'}
              </span>
            </button>
          </div>
        </div>
      </div>

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSubmit={handleNewReport}
        defaultCoords={pinnedTempCoords || gpsLocation || center}
        userEmail={user?.email || 'student@hitam.org'}
        userName={user?.name}
        userRole={user?.role}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={(u) => setUser(u)}
      />

      <SafetyMethodologyModal
        isOpen={isMethodologyOpen}
        onClose={() => setIsMethodologyOpen(false)}
      />

      <EmergencyModal
        isOpen={isEmergencyOpen}
        onClose={() => setIsEmergencyOpen(false)}
        currentCoords={gpsLocation || center}
      />
    </div>
  );
}
