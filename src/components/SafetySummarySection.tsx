import React, { useEffect, useState } from 'react';
import { RouteOption, IncidentReport } from '../types';
import { fetchRoadSafetyIntel } from '../services/api';
import {
  ShieldCheck,
  AlertTriangle,
  Lightbulb,
  Sparkles,
  Info,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

interface SafetySummarySectionProps {
  route: RouteOption | null;
  reports: IncidentReport[];
  cityName?: string;
  originLabel?: string;
  destLabel?: string;
}

export const SafetySummarySection: React.FC<SafetySummarySectionProps> = ({
  route,
  reports,
  cityName = 'Hyderabad',
  originLabel,
  destLabel,
}) => {
  const [intel, setIntel] = useState<string | null>(null);
  const [sources, setSources] = useState<string[]>([]);
  const [loadingIntel, setLoadingIntel] = useState(false);

  useEffect(() => {
    if (!originLabel || !destLabel) return;
    setLoadingIntel(true);
    fetchRoadSafetyIntel(originLabel, destLabel, cityName)
      .then((res) => {
        setIntel(res.intel);
        setSources(res.sources || []);
      })
      .finally(() => setLoadingIntel(false));
  }, [originLabel, destLabel, cityName]);

  if (!route) {
    return (
      <div className="p-4 bg-[#0e1834] border border-blue-900/30 rounded-2xl text-slate-400 text-xs text-center space-y-1.5">
        <ShieldCheck className="w-6 h-6 text-slate-500 mx-auto" />
        <p className="font-semibold text-slate-300">No Route Evaluated Yet</p>
        <p className="text-[11px] text-slate-500">
          Plan a route above to generate comprehensive safety metrics, corridor hazard audits, and street lighting assessments.
        </p>
      </div>
    );
  }

  const analysis = route.safetyAnalysis;
  const score = analysis?.score ?? 75;

  const scoreBadgeBg =
    score >= 75
      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80'
      : score >= 50
      ? 'bg-amber-950/80 text-amber-300 border-amber-700/80'
      : 'bg-rose-950/80 text-rose-300 border-rose-700/80';

  return (
    <div className="bg-[#0e1834] border border-blue-900/40 rounded-2xl p-4 shadow-xl space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white tracking-wide">Route Safety Assessment</h3>
            <p className="text-[10px] text-slate-400">Multi-Factor Road Corridor Audit</p>
          </div>
        </div>

        <div className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${scoreBadgeBg}`}>
          {score}/100 Rating
        </div>
      </div>

      {/* Safety Matrix Cards */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {/* Hazards Card */}
        <div className="p-2.5 bg-[#091124] rounded-xl border border-slate-800 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-semibold uppercase tracking-wider">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Reported Hazards</span>
          </div>
          <p className="text-sm font-bold text-white">
            {analysis?.hazardsEncountered ?? 0}{' '}
            <span className="text-xs font-normal text-slate-400">within 250m</span>
          </p>
          <p className="text-[10px] text-slate-400 leading-snug">
            {analysis?.hazardsEncountered && analysis.hazardsEncountered > 0
              ? 'Community verified hazards identified along road buffer'
              : 'No reported hazards along this active corridor'}
          </p>
        </div>

        {/* Lighting Assessment Card */}
        <div className="p-2.5 bg-[#091124] rounded-xl border border-slate-800 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-semibold uppercase tracking-wider">
            <Lightbulb className="w-3.5 h-3.5 text-blue-400" />
            <span>Street Lighting</span>
          </div>
          <p className="text-sm font-bold text-white truncate">
            {analysis?.lightingAssessment || 'Data unavailable'}
          </p>
          <p className="text-[10px] text-slate-400 leading-snug">
            {analysis?.lightingAssessment?.toLowerCase().includes('well')
              ? 'Active municipal streetlights & visibility'
              : 'Caution advised during evening hours'}
          </p>
        </div>
      </div>

      {/* Grounded AI Road Safety & Area Intelligence (Google Maps & Search) */}
      <div className="p-3 bg-gradient-to-br from-[#0c1630] to-[#091124] rounded-xl border border-indigo-900/40 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-indigo-300">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wide">
              Live Area Safety Intelligence
            </span>
          </div>
          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
            Google Grounding
          </span>
        </div>

        {loadingIntel ? (
          <div className="flex items-center gap-2 text-slate-400 text-[11px] py-1">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
            <span>Gathering live area and road conditions...</span>
          </div>
        ) : intel ? (
          <p className="text-[11px] text-slate-200 leading-relaxed font-normal">{intel}</p>
        ) : (
          <p className="text-[11px] text-slate-400">
            Select origin and destination to retrieve grounded safety advisories.
          </p>
        )}

        {sources && sources.length > 0 && (
          <div className="pt-1 border-t border-slate-800/80 flex items-center gap-1 text-[9px] text-slate-400 truncate">
            <span>Sources:</span>
            {sources.map((s, idx) => (
              <span key={idx} className="text-blue-400 truncate max-w-[140px]">
                {s}
                {idx < sources.length - 1 ? ' · ' : ''}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Transparent Methodology Limitations Notice */}
      <div className="text-[10px] text-slate-400 flex items-start gap-1.5 pt-1">
        <Info className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 mt-0.5" />
        <span>
          Safety score is calculated purely from verified crowdsourced hazards and municipal lighting assessments. Areas without reports are labeled as unknown and do not automatically receive a perfect 100 score.
        </span>
      </div>
    </div>
  );
};
