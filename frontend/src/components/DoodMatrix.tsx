import React from 'react';
import { ActorDOODRow } from '../types';
import { Users, Zap, ShieldAlert } from 'lucide-react';

interface DoodMatrixProps {
  doodMatrix: ActorDOODRow[];
  numDays: number;
  onUpdateActorBlackout?: (actorId: string, blackoutDays: number[]) => void;
  onReOptimize?: () => void;
  isSolving?: boolean;
}

export const DoodMatrix: React.FC<DoodMatrixProps> = ({
  doodMatrix,
  numDays,
  onUpdateActorBlackout,
  onReOptimize,
  isSolving = false,
}) => {
  const totalCost = doodMatrix.reduce((acc, r) => acc + r.talent_cost, 0);
  const totalHoldDays = doodMatrix.reduce((acc, r) => acc + r.hold_days, 0);
  const totalWorkDays = doodMatrix.reduce((acc, r) => acc + r.work_days, 0);

  const daysHeader = Array.from({ length: numDays }, (_, i) => i + 1);

  const hasAnyConflict = doodMatrix.some((r) => r.day_codes.includes('!W'));

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-lg space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-400" />
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">DAY-OUT-OF-DAYS (DOOD) TALENT MATRIX</h2>
            <p className="text-xs text-slate-400">Manage cast availability, hold days, and contractual blackout windows</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-300">W (Work)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="text-slate-300">H (Hold Fee)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            <span className="text-slate-300">F (Finish)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
            <span className="text-slate-300">U (Blackout)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
            <span className="text-slate-400">- (Off)</span>
          </span>
        </div>
      </div>

      {hasAnyConflict && (
        <div className="p-3 bg-red-950/60 border border-red-800 rounded-lg flex items-center justify-between gap-3 text-xs text-red-200">
          <div className="flex items-center gap-2 font-semibold">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
            <span>Cast conflict detected: One or more actors are scheduled to shoot on their contractual blackout dates (!W).</span>
          </div>
          {onReOptimize && (
            <button
              onClick={onReOptimize}
              disabled={isSolving}
              className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-500 text-white font-bold text-xs shrink-0 cursor-pointer transition-colors"
            >
              {isSolving ? 'Optimizing...' : 'Auto-Resolve with CP-SAT'}
            </button>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 font-medium">
              <th className="py-2.5 px-3">Character / Cast</th>
              <th className="py-2.5 px-2 text-center" title="Click day numbers below to mark actor unavailable">
                Unavailable / Blackouts
              </th>
              {daysHeader.map((d) => (
                <th key={d} className="py-2.5 px-2 text-center">
                  Day {d}
                </th>
              ))}
              <th className="py-2.5 px-3 text-center">Work</th>
              <th className="py-2.5 px-3 text-center">Hold</th>
              <th className="py-2.5 px-3 text-right">Talent Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {doodMatrix.map((row) => (
              <tr key={row.actor_id} className="hover:bg-slate-800/30 transition-colors">
                <td className="py-2.5 px-3">
                  <div className="font-semibold text-white">{row.character_name}</div>
                  <div className="text-[11px] text-slate-400">{row.name}</div>
                </td>

                {/* Interactive Blackout / Unavailable Days Toggles */}
                <td className="py-2.5 px-2 text-center">
                  <div className="flex items-center justify-center gap-1">
                    {daysHeader.map((d) => {
                      const isBlackout = (row.blackout_days || []).includes(d);
                      return (
                        <button
                          key={d}
                          onClick={() => {
                            if (!onUpdateActorBlackout) return;
                            const cur = row.blackout_days || [];
                            const next = isBlackout
                              ? cur.filter((x) => x !== d)
                              : [...cur, d].sort((a, b) => a - b);
                            onUpdateActorBlackout(row.actor_id, next);
                          }}
                          title={
                            isBlackout
                              ? `Day ${d}: Unavailable for ${row.name}. Click to make available.`
                              : `Day ${d}: Available. Click to mark unavailable.`
                          }
                          className={`w-5 h-5 rounded text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center border ${
                            isBlackout
                              ? 'bg-rose-600 text-white border-rose-400 shadow-sm shadow-rose-900/50 hover:bg-rose-700'
                              : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border-slate-700/80'
                          }`}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </td>

                {row.day_codes.map((code, idx) => {
                  let pillClass = 'bg-slate-800/40 text-slate-500 border-transparent';
                  let cellTitle = `Day ${idx + 1}: Off`;
                  if (code === 'W') {
                    pillClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-bold';
                    cellTitle = `Day ${idx + 1}: Working`;
                  } else if (code === 'H') {
                    pillClass = 'bg-rose-500/25 text-rose-300 border-rose-500/40 font-black shadow-sm';
                    cellTitle = `Day ${idx + 1}: On Hold (Fee Incurred)`;
                  } else if (code === 'F') {
                    pillClass = 'bg-purple-500/25 text-purple-300 border-purple-500/40 font-bold';
                    cellTitle = `Day ${idx + 1}: Final Shoot Day`;
                  } else if (code === 'U') {
                    pillClass = 'bg-rose-950/90 text-rose-300 border-rose-800 font-bold';
                    cellTitle = `Day ${idx + 1}: Blackout / Unavailable`;
                  } else if (code === '!W') {
                    pillClass = 'bg-red-600 text-white border-red-400 font-black animate-pulse shadow-md';
                    cellTitle = `CONFLICT: Scheduled on Blackout Day!`;
                  }

                  return (
                    <td key={idx} className="py-2.5 px-2 text-center" title={cellTitle}>
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-md border text-xs ${pillClass}`}
                      >
                        {code}
                      </span>
                    </td>
                  );
                })}

                <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-300">
                  {row.work_days}d
                </td>

                <td className="py-2.5 px-3 text-center font-mono">
                  {row.hold_days > 0 ? (
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                      {row.hold_days}d
                    </span>
                  ) : (
                    <span className="text-slate-500">0d</span>
                  )}
                </td>

                <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                  ${row.talent_cost.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-700 bg-slate-800/30 font-bold">
              <td className="py-3 px-3 text-white">TOTALS ({doodMatrix.length} Actors)</td>
              <td></td>
              <td colSpan={numDays}></td>
              <td className="py-3 px-3 text-center text-slate-300 font-mono">{totalWorkDays}d</td>
              <td className="py-3 px-3 text-center text-rose-300 font-mono">{totalHoldDays}d</td>
              <td className="py-3 px-3 text-right text-emerald-400 font-mono text-sm">
                ${totalCost.toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
        <span className="text-slate-400">
          💡 <strong className="text-slate-200">Contractual Blackouts:</strong> Click any day button in the <em>Unavailable / Blackouts</em> column to mark an actor unavailable. When finished staging dates, click <strong>Re-Optimize</strong> to let CP-SAT enforce constraints.
        </span>
        {onReOptimize && (
          <button
            onClick={onReOptimize}
            disabled={isSolving}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-md shadow-amber-500/20"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>{isSolving ? 'Optimizing...' : 'Re-Optimize Around Blackouts'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
