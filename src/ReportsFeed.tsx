import React, { useState } from 'react';
import {
  ShieldAlert,
  Filter,
  Search,
  ThumbsUp,
  MapPin,
  Clock,
  ExternalLink,
  CheckCircle,
  Lightbulb,
} from 'lucide-react';
import { IncidentReport, IncidentCategory, SeverityLevel } from './types';

interface ReportsFeedProps {
  reports: IncidentReport[];
  onSelectReport: (report: IncidentReport) => void;
  onConfirmReport: (reportId: string) => void;
  onOpenReportModal: () => void;
}

export const ReportsFeed: React.FC<ReportsFeedProps> = ({
  reports,
  onSelectReport,
  onConfirmReport,
  onOpenReportModal,
}) => {
  const [filterCat, setFilterCat] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = reports.filter((r) => {
    if (filterCat !== 'all' && r.category !== filterCat) return false;
    if (filterSeverity !== 'all' && r.severity !== filterSeverity) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        (r.address && r.address.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-1 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-600/20 text-amber-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Community Hazard Feed</h3>
            <p className="text-[10px] text-slate-400">{filtered.length} active reports matching filters</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenReportModal}
          className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white shadow transition"
        >
          + Report
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-2">
        <div className="relative">
          <input
            type="text"
            placeholder="Search hazard reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-slate-950 text-slate-200 pl-7 pr-3 py-1.5 rounded-lg border border-slate-800 focus:outline-none focus:border-amber-500 placeholder:text-slate-500"
          />
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-2" />
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="bg-slate-950 text-slate-300 border border-slate-800 rounded-lg px-2 py-1.5 text-xs focus:outline-none"
          >
            <option value="all">All Categories</option>
            <option value="poor_lighting">Poor Lighting</option>
            <option value="harassment">Harassment</option>
            <option value="accident">Accident Spot</option>
            <option value="suspicious_activity">Suspicious Activity</option>
            <option value="isolated_area">Deserted Path</option>
            <option value="road_hazard">Road Hazard</option>
          </select>

          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="bg-slate-950 text-slate-300 border border-slate-800 rounded-lg px-2 py-1.5 text-xs focus:outline-none"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical Only</option>
            <option value="high">High Severity</option>
            <option value="medium">Medium Caution</option>
            <option value="low">Low Hazard</option>
          </select>
        </div>
      </div>

      {/* Scrollable list */}
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            <p>No community reports found matching filters.</p>
            <button
              onClick={() => {
                setFilterCat('all');
                setFilterSeverity('all');
                setSearchQuery('');
              }}
              className="mt-2 text-blue-400 hover:underline text-[11px]"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filtered.map((report) => {
            const severityPill =
              report.severity === 'critical'
                ? 'bg-red-950/80 text-red-400 border-red-800'
                : report.severity === 'high'
                ? 'bg-orange-950/80 text-orange-400 border-orange-800'
                : report.severity === 'medium'
                ? 'bg-amber-950/80 text-amber-400 border-amber-800'
                : 'bg-blue-950/80 text-blue-400 border-blue-800';

            return (
              <div
                key={report.id}
                className="p-3 bg-slate-950/60 border border-slate-800/90 hover:border-slate-700 rounded-xl transition text-xs space-y-1.5"
              >
                {/* Pill & Date */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${severityPill}`}>
                      {report.category.replace('_', ' ')} • {report.severity}
                    </span>
                    {report.verified && (
                      <span className="flex items-center gap-0.5 text-[10px] text-emerald-400">
                        <CheckCircle className="w-3 h-3" /> Verified
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {new Date(report.reportedAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Title */}
                <h4
                  onClick={() => onSelectReport(report)}
                  className="font-bold text-slate-100 hover:text-blue-400 cursor-pointer flex items-center justify-between group"
                >
                  <span className="line-clamp-1">{report.title}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 flex-shrink-0" />
                </h4>

                {/* Description */}
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  {report.description}
                </p>

                {/* Lighting and photo info */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-900">
                  <span className="flex items-center gap-1">
                    <Lightbulb className="w-3 h-3 text-amber-400" />
                    {report.lightingCondition.replace('_', ' ')}
                  </span>
                  {report.photoUrl && (
                    <span className="text-blue-400 font-medium">📷 Photo evidence</span>
                  )}
                </div>

                {/* Action footer */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-900/80 text-[10px]">
                  <span className="text-slate-500 truncate max-w-[150px]">By: {report.reportedBy}</span>
                  <button
                    type="button"
                    onClick={() => onConfirmReport(report.id)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition font-medium"
                  >
                    <ThumbsUp className="w-3 h-3 text-blue-400" /> Confirm ({report.confirmations || 0})
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
