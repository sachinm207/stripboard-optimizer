import React from 'react';
import { TrendingUp, Clock, ShieldCheck, Truck, Users, AlertTriangle } from 'lucide-react';
import { ScheduleMetrics, DisruptionAlert } from '../types';

interface CostMeterProps {
  metrics: ScheduleMetrics;
  disruptions: DisruptionAlert[];
}

export const CostMeter: React.FC<CostMeterProps> = ({ metrics, disruptions }) => {
  const isCompliant = metrics.total_turnaround_violations === 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 my-6">
      {/* 1. Net Savings Meter */}
      <div className="bg-slate-900/90 border border-emerald-500/30 rounded-xl p-3.5 shadow-lg relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all" />
        <div className="flex items-center justify-between text-xs text-emerald-400 font-medium mb-1">
          <span>Est. Budget Saved</span>
          <TrendingUp className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="text-xl lg:text-2xl font-black text-white tracking-tight">
          ${metrics.cost_saved_vs_naive.toLocaleString()}
        </div>
        <p className="text-[11px] text-emerald-400/80 font-mono mt-0.5">vs. naive reschedule</p>
      </div>

      {/* 2. Solver Latency */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-lg relative overflow-hidden group">
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1">
          <span>CP-SAT Solver</span>
          <Clock className="w-4 h-4 text-sky-400" />
        </div>
        <div className="text-xl lg:text-2xl font-black text-white tracking-tight font-mono">
          {metrics.solver_runtime_ms} <span className="text-xs font-normal text-slate-400">ms</span>
        </div>
        <p className="text-[11px] text-sky-400/80 font-mono mt-0.5">Exact satisfaction</p>
      </div>

      {/* 3. SAG-AFTRA Turnaround */}
      <div className={`bg-slate-900/90 border ${isCompliant ? 'border-indigo-500/30' : 'border-rose-500/40'} rounded-xl p-3.5 shadow-lg relative overflow-hidden group`}>
        <div className="flex items-center justify-between text-xs text-indigo-400 font-medium mb-1">
          <span>SAG-AFTRA 12h Rest</span>
          <ShieldCheck className={`w-4 h-4 ${isCompliant ? 'text-indigo-400' : 'text-rose-400'}`} />
        </div>
        <div className="text-xl lg:text-2xl font-black text-white tracking-tight">
          {Math.round(metrics.union_compliance_rate * 100)}%
        </div>
        <p className={`text-[11px] ${isCompliant ? 'text-indigo-400/80' : 'text-rose-400'} font-mono mt-0.5`}>
          {metrics.total_turnaround_violations} forced calls
        </p>
      </div>

      {/* 4. Company Moves */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-lg relative overflow-hidden group">
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1">
          <span>Company Moves</span>
          <Truck className="w-4 h-4 text-amber-400" />
        </div>
        <div className="text-xl lg:text-2xl font-black text-white tracking-tight">
          {metrics.total_company_moves} <span className="text-xs font-normal text-slate-400">moves</span>
        </div>
        <p className="text-[11px] text-amber-400/80 font-mono mt-0.5">Clustered locations</p>
      </div>

      {/* 5. Talent Hold Days */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-lg relative overflow-hidden group">
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1">
          <span>Talent Hold Days</span>
          <Users className="w-4 h-4 text-purple-400" />
        </div>
        <div className="text-xl lg:text-2xl font-black text-white tracking-tight">
          {metrics.total_hold_days} <span className="text-xs font-normal text-slate-400">days</span>
        </div>
        <p className="text-[11px] text-purple-400/80 font-mono mt-0.5">Idle fees minimized</p>
      </div>

      {/* 6. Active Disruptions */}
      <div className={`bg-slate-900/90 border ${disruptions.length > 0 ? 'border-amber-500/40' : 'border-slate-800'} rounded-xl p-3.5 shadow-lg relative overflow-hidden group`}>
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1">
          <span>Chaos Ingested</span>
          <AlertTriangle className={`w-4 h-4 ${disruptions.length > 0 ? 'text-amber-400 animate-bounce' : 'text-slate-500'}`} />
        </div>
        <div className="text-xl lg:text-2xl font-black text-white tracking-tight">
          {disruptions.length} <span className="text-xs font-normal text-slate-400">alerts</span>
        </div>
        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
          {disruptions.length > 0 ? 'Re-optimized in real time' : 'Nominal schedule'}
        </p>
      </div>
    </div>
  );
};
