import React, { useState, useEffect } from 'react';
import { X, Sliders, ShieldCheck, Clock, Calendar, CheckCircle } from 'lucide-react';
import { fetchProductionSettings, updateProductionSettings } from '../services/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updatedSolution: any) => void;
  isSaving?: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  isSaving = false,
}) => {
  const [turnaroundPenalty, setTurnaroundPenalty] = useState(25000);
  const [permitLeadDays, setPermitLeadDays] = useState(0);
  const [maxMinutesPerDay, setMaxMinutesPerDay] = useState(600);
  const [startDate, setStartDate] = useState('2026-10-12');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchProductionSettings()
        .then((s) => {
          setTurnaroundPenalty(s.w_turnaround);
          setPermitLeadDays(s.permit_lead_days);
          setMaxMinutesPerDay(s.max_minutes_per_day);
          if (s.start_date) {
            setStartDate(s.start_date);
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await updateProductionSettings({
        w_turnaround: turnaroundPenalty,
        permit_lead_days: permitLeadDays,
        max_minutes_per_day: maxMinutesPerDay,
        start_date: startDate,
      });
      onSaved(res);
      onClose();
    } catch (err) {
      console.error('Failed to update settings', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Production Policy & Union Rules</h3>
              <p className="text-xs text-slate-400">
                Configure labor penalties, calendar start date, and work hour caps
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* Principal Photography Start Date */}
          <div className="border-b border-slate-800 pb-4">
            <label className="block text-xs font-bold text-white mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-purple-400" />
                Principal Photography Start Date (Day 1)
              </span>
              <span className="text-purple-300 font-mono font-bold text-xs">{startDate}</span>
            </label>
            <p className="text-[11px] text-slate-400 mb-2">
              Industry standard calendar anchor for Day 1 call. All subsequent days, hiatuses, and call sheets automatically sync to this date.
            </p>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono cursor-pointer"
            />
          </div>

          {/* SAG Penalty Input */}
          <div>
            <label className="block text-xs font-bold text-white mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                SAG-AFTRA / Union Turnaround Penalty
              </span>
              <span className="text-amber-400 font-mono font-black">${turnaroundPenalty.toLocaleString()} / violation</span>
            </label>
            <p className="text-[11px] text-slate-400 mb-2">
              Forced call penalty for violating the mandatory 12-hour crew rest window between night wrap and day call.
            </p>
            <input
              type="range"
              min={1000}
              max={50000}
              step={1000}
              value={turnaroundPenalty}
              onChange={(e) => setTurnaroundPenalty(Number(e.target.value))}
              className="w-full accent-amber-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
              <span>$1,000 (Low / Regional)</span>
              <span>$5,000 (SAG Standard)</span>
              <span>$25,000 (Studio Heavy)</span>
              <span>$50,000 (Max)</span>
            </div>
          </div>

          {/* Permit Lead-Time Notice Window */}
          <div className="border-t border-slate-800 pt-4">
            <label className="block text-xs font-bold text-white mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-sky-400" />
                Location Permit Lead-Time ("Frozen Horizon")
              </span>
              <span className="text-sky-400 font-mono font-black">{permitLeadDays} Day{permitLeadDays !== 1 ? 's' : ''} Notice</span>
            </label>
            <p className="text-[11px] text-slate-400 mb-2.5">
              Minimum advance notice required to secure municipal city permits. Restricts sudden rescheduling to unpermitted exterior locations.
            </p>
            <div className="flex items-center gap-2">
              {[0, 1, 2, 3, 4].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setPermitLeadDays(d)}
                  className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-all ${
                    permitLeadDays === d
                      ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-sm'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  {d === 0 ? 'None (Stage)' : `${d} Day${d > 1 ? 's' : ''}`}
                </button>
              ))}
            </div>
          </div>

          {/* Daily Max Shoot Minutes */}
          <div className="border-t border-slate-800 pt-4">
            <label className="block text-xs font-bold text-white mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                Maximum Daily Shoot Limit
              </span>
              <span className="text-amber-400 font-mono font-black">{Math.floor(maxMinutesPerDay / 60)} Hours ({maxMinutesPerDay} mins)</span>
            </label>
            <p className="text-[11px] text-slate-400 mb-2">
              Maximum allowable daily camera roll duration before mandatory crew overtime and meal penalties.
            </p>
            <div className="flex items-center gap-2">
              {[480, 540, 600, 660, 720].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setMaxMinutesPerDay(mins)}
                  className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-all ${
                    maxMinutesPerDay === mins
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  {mins / 60}h
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving || loading}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-900/20 transition-all cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isSaving ? 'Saving Rules...' : 'Apply Rules & Policies'}</span>
            </button>
          </div>
          <p className="text-[10px] text-slate-400 text-right">
            Policy updates are saved immediately. Click <strong className="text-emerald-400">"⚡ Optimize Schedule"</strong> on the board when ready to solve.
          </p>
        </form>
      </div>
    </div>
  );
};
