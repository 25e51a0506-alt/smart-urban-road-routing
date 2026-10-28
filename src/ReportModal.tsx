import React, { useState } from 'react';
import {
  X,
  Camera,
  MapPin,
  AlertTriangle,
  Lightbulb,
  ShieldAlert,
  CheckCircle2,
  Image as ImageIcon,
} from 'lucide-react';
import { IncidentCategory, IncidentReport, SeverityLevel, LightingCondition, Coordinates } from './types';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (report: IncidentReport) => void;
  defaultCoords: Coordinates;
  userEmail: string;
  userName?: string;
  userRole?: string;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  defaultCoords,
  userEmail,
  userName,
  userRole,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState<IncidentCategory>('poor_lighting');
  const [severity, setSeverity] = useState<SeverityLevel>('medium');
  const [lighting, setLighting] = useState<LightingCondition>('poor');
  const [photoUrl, setPhotoUrl] = useState<string>('');

  if (!isOpen) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Image is larger than 2MB. Please select a smaller photo for optimal performance.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newReport: IncidentReport = {
      id: `rep-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || 'No additional details provided.',
      address: address.trim() || undefined,
      category,
      severity,
      lightingCondition: lighting,
      coordinates: defaultCoords,
      reportedAt: new Date().toISOString(),
      reportedBy: userName || userEmail.split('@')[0] || 'Community Commuter',
      userRole: userRole || 'commuter',
      photoUrl: photoUrl || undefined,
      verified: false,
      confirmations: 1,
    };

    onSubmit(newReport);
    // Reset fields
    setTitle('');
    setDescription('');
    setAddress('');
    setPhotoUrl('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl text-slate-100 my-8">
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-600/20 text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">File Community Safety Report</h3>
              <p className="text-[11px] text-slate-400">Crowdsourced alerts help peers avoid dangerous corridors</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleFormSubmit} className="space-y-3.5 mt-4 text-xs">
          {/* Title */}
          <div>
            <label className="block font-semibold text-slate-200 mb-1">
              Hazard Title / Summary <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Non-functional streetlights over 300m stretch"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
            />
          </div>

          {/* Category & Severity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-200 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as IncidentCategory)}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="poor_lighting">Poor / No Lighting</option>
                <option value="harassment">Harassment / Verbal Threat</option>
                <option value="accident">Accident Prone Spot</option>
                <option value="suspicious_activity">Suspicious Activity / Loitering</option>
                <option value="isolated_area">Deserted / Isolated Path</option>
                <option value="road_hazard">Physical Obstacle / Trench</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-200 mb-1">Severity Level</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as SeverityLevel)}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="low">Low (Minor inconvenience)</option>
                <option value="medium">Medium (Exercise caution)</option>
                <option value="high">High (Avoid walking alone at night)</option>
                <option value="critical">Critical (Immediate danger reported)</option>
              </select>
            </div>
          </div>

          {/* Street Lighting Observation */}
          <div>
            <label className="block font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> Street Lighting Observation
            </label>
            <select
              value={lighting}
              onChange={(e) => setLighting(e.target.value as LightingCondition)}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-blue-500"
            >
              <option value="pitch_black">Pitch Black (Complete darkness / all lamps broken)</option>
              <option value="poor">Poor (Dim, flickering, or widely spaced lights)</option>
              <option value="moderate">Moderate (Reasonable sidewalk visibility)</option>
              <option value="well_lit">Well Lit (Continuous bright halogen/LED lamps)</option>
              <option value="unknown">Unknown / Not applicable</option>
            </select>
          </div>

          {/* Location Landmark / Address */}
          <div>
            <label className="block font-semibold text-slate-200 mb-1">Landmark or Street Address</label>
            <input
              type="text"
              placeholder="e.g. Near campus north bus stop, opposite pharmacy"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
            />
          </div>

          {/* Detailed Description */}
          <div>
            <label className="block font-semibold text-slate-200 mb-1">Detailed Description</label>
            <textarea
              rows={3}
              placeholder="Provide context: specific hours it is dangerous, presence of cameras, safety advice for other pedestrians..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
            />
          </div>

          {/* Photo Evidence */}
          <div>
            <label className="block font-semibold text-slate-200 mb-1">Photo Evidence (Optional)</label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition">
                <Camera className="w-4 h-4 text-blue-400" />
                <span>Upload Evidence Photo</span>
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </label>
              {photoUrl && (
                <span className="text-emerald-400 text-[11px] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Photo attached
                </span>
              )}
            </div>

            {photoUrl && (
              <div className="relative mt-2 inline-block">
                <img
                  src={photoUrl}
                  alt="Hazard preview"
                  className="h-24 w-36 object-cover rounded-xl border border-slate-700"
                />
                <button
                  type="button"
                  onClick={() => setPhotoUrl('')}
                  className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full p-0.5 shadow"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Pinned Coordinates Display */}
          <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-rose-400" />
              <span>Target Coordinates:</span>
            </div>
            <span className="font-mono text-slate-200">
              {defaultCoords[0].toFixed(5)}° N, {defaultCoords[1].toFixed(5)}° E
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold shadow-lg shadow-amber-900/40 transition"
            >
              Broadcast Hazard Alert
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
