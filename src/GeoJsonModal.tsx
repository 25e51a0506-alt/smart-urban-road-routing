import React, { useState } from 'react';
import { RouteOption } from './types';
import { buildRouteGeoJSON, downloadRouteGeoJSON } from './services/geoJsonExport';
import {
  Download,
  Copy,
  Check,
  X,
  FileCode,
  ShieldCheck,
  MapPin,
  ExternalLink,
  Info,
} from 'lucide-react';

interface GeoJsonModalProps {
  isOpen: boolean;
  onClose: () => void;
  route: RouteOption | null;
  originName?: string;
  destName?: string;
}

export const GeoJsonModal: React.FC<GeoJsonModalProps> = ({
  isOpen,
  onClose,
  route,
  originName,
  destName,
}) => {
  const [copied, setCopied] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  if (!isOpen || !route) return null;

  const geoJsonData = buildRouteGeoJSON(route, {
    originLabel: originName,
    destLabel: destName,
    includeWaypoints: true,
  });

  const jsonString = JSON.stringify(geoJsonData, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy GeoJSON to clipboard:', err);
    }
  };

  const handleDownload = () => {
    try {
      const fileName = downloadRouteGeoJSON(route, {
        originLabel: originName,
        destLabel: destName,
      });
      setDownloadSuccess(fileName);
      setTimeout(() => setDownloadSuccess(null), 3500);
    } catch (err) {
      console.error('Failed to download GeoJSON:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">GeoJSON Route Export</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                  RFC 7946 Standard
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {route.name} • {route.geometry.length} Coordinates • Safety Score {route.safetyAnalysis.score}/100
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-300 flex-1">
          {/* Information box */}
          <div className="p-3 bg-blue-950/40 border border-blue-800/60 rounded-xl text-blue-200 text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-white">Universal GIS & Map Format</p>
              <p className="text-[11px] text-blue-300/90 leading-relaxed">
                Coordinates are strictly converted to standard WGS 84 <code className="bg-blue-900/60 px-1 py-0.5 rounded font-mono">[longitude, latitude]</code> format. Compatible with QGIS, geojson.io, ArcGIS, Leaflet, Mapbox, and navigation hardware.
              </p>
            </div>
          </div>

          {/* Route Metadata Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
              <span className="block text-[10px] text-slate-500 uppercase font-semibold">Distance</span>
              <span className="text-sm font-bold text-white">{route.distanceKm} km</span>
            </div>
            <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
              <span className="block text-[10px] text-slate-500 uppercase font-semibold">Duration</span>
              <span className="text-sm font-bold text-white">{route.durationMin} min</span>
            </div>
            <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
              <span className="block text-[10px] text-slate-500 uppercase font-semibold">Safety Score</span>
              <span className="text-sm font-bold text-emerald-400">{route.safetyAnalysis.score}/100</span>
            </div>
            <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
              <span className="block text-[10px] text-slate-500 uppercase font-semibold">Waypoints</span>
              <span className="text-sm font-bold text-blue-400">{route.geometry.length} pts</span>
            </div>
          </div>

          {downloadSuccess && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-700 text-emerald-200 rounded-xl text-xs flex items-center justify-between animate-fade-in">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>
                  Saved <strong>{downloadSuccess}</strong> directly to your device downloads folder!
                </span>
              </div>
            </div>
          )}

          {/* GeoJSON Preview Code block */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-semibold text-slate-300">GeoJSON Data Preview</span>
              <span>{(jsonString.length / 1024).toFixed(1)} KB</span>
            </div>
            <div className="relative">
              <pre className="p-3 bg-slate-950 text-slate-300 font-mono text-[11px] rounded-xl border border-slate-800 overflow-x-auto max-h-56 overflow-y-auto leading-relaxed select-all">
                {jsonString}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center gap-2"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 font-bold">Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-400" />
                <span>Copy Raw GeoJSON</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white text-xs font-semibold rounded-xl transition"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-900/40 flex items-center gap-2 transition transform active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Download .geojson File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
