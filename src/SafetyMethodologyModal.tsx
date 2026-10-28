import React from 'react';
import { X, Shield, AlertTriangle, Lightbulb, BookOpen, Scale, Sparkles } from 'lucide-react';

interface SafetyMethodologyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SafetyMethodologyModal: React.FC<SafetyMethodologyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl text-slate-100 my-8">
        <div className="flex justify-between items-center pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Safety Scoring Algorithm & Transparency</h3>
              <p className="text-[11px] text-slate-400">Academic Prototype Methodology & Ethical Boundaries</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 mt-4 text-xs text-slate-300 leading-relaxed max-h-[70vh] overflow-y-auto pr-2">
          {/* Important Ethical Disclaimer Banner */}
          <div className="p-3 bg-amber-950/60 border border-amber-700/80 rounded-2xl flex items-start gap-3 text-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-amber-100 text-xs">Advisory Prototype Notice</h4>
              <p className="text-[11px] text-amber-200/90 mt-0.5">
                This project does not invent or pull from official state crime records. All safety indices are
                relative mathematical estimates computed strictly from crowdsourced community hazard alerts and reported
                street lighting conditions. No algorithm can guarantee 100% personal safety. Always exercise situational awareness and use emergency services when needed.
              </p>
            </div>
          </div>

          {/* Mathematical Formula */}
          <div>
            <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-blue-400" /> Transparent Mathematical Formulation
            </h4>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px] text-blue-300 space-y-1">
              <p>Base Road Score = 92 points (capped below 100)</p>
              <p>For each incident within 250m Haversine buffer:</p>
              <p className="pl-4 text-rose-300">• Critical Incident: -25 points</p>
              <p className="pl-4 text-orange-300">• High Severity: -18 points</p>
              <p className="pl-4 text-amber-300">• Medium Severity: -10 points</p>
              <p className="pl-4 text-blue-300">• Low Severity: -5 points</p>
              <p className="pl-4 text-rose-400">• Pitch Black Lighting: extra -8 points</p>
              <p className="pl-4 text-yellow-300">• Poor / Flickering Lighting: extra -4 points</p>
              <p>Well-lit verified corridor: +3 to +6 points bonus</p>
              <p>Bounded Range: [15, 96]</p>
            </div>
          </div>

          {/* Spatial Buffering */}
          <div>
            <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400" /> Spatial Haversine Buffering
            </h4>
            <p>
              The system calculates great-circle distances along sampled coordinates of the road route returned by the
              OSRM engine. Any community report within a 250-meter radius of any segment of the polyline impacts the
              overall corridor safety rating.
            </p>
          </div>

          {/* Unknown / Sparsity */}
          <div>
            <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4 text-amber-400" /> Handling Unknown / Unreported Data
            </h4>
            <p>
              When a route passes through areas with zero submitted community reports, the system explicitly labels the
              lighting as &quot;Lighting data unavailable&quot; rather than assuming default visibility. It avoids creating false senses of security by showing an
              explicit data unavailability indicator.
            </p>
          </div>

          {/* Distinction */}
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-[11px]">
            <h5 className="font-semibold text-slate-200 mb-1">Three-Tiered Data Classification:</h5>
            <ul className="list-disc pl-4 space-y-1 text-slate-400">
              <li><strong className="text-blue-300">Verified Reports:</strong> Validated by campus safety ambassadors or verified peer counters.</li>
              <li><strong className="text-amber-300">User Submissions:</strong> Freshly reported by registered students or commuters awaiting multiple confirmations.</li>
              <li><strong className="text-purple-300">Demonstration Starter Data:</strong> Pre-loaded realistic incident scenarios to allow instant evaluator testing.</li>
            </ul>
          </div>
        </div>

        <div className="pt-4 mt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl transition"
          >
            I Understand & Agree
          </button>
        </div>
      </div>
    </div>
  );
};
