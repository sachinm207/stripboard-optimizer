import React from 'react';
import { ActorDOODRow } from '../types';
import { Users } from 'lucide-react';

interface DoodMatrixProps {
  doodMatrix: ActorDOODRow[];
  numDays: number;
}

export const DoodMatrix: React.FC<DoodMatrixProps> = ({ doodMatrix, numDays }) => {
  const totalCost = doodMatrix.reduce((acc, r) => acc + r.talent_cost, 0);
  const totalHoldDays = doodMatrix.reduce((acc, r) => acc + r.hold_days, 0);
  const totalWorkDays = doodMatrix.reduce((acc, r) => acc + r.work_days, 0);

  const daysHeader = Array.from({ length: numDays }, (_, i) => i + 1);

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-400" />
          <h2 className="text-base font-bold text-white tracking-tight">DAY-OUT-OF-DAYS (DOOD) TALENT MATRIX</h2>
        </div>
        <div className="flex items-center gap-3 text-xs">
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
            <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
            <span className="text-slate-400">- (Off)</span>
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 font-medium">
              <th className="py-2.5 px-3 min-w-[170px] sticky left-0 bg-slate-900 z-10 border-r border-slate-800">Character / Cast</th>
              <th className="py-2.5 px-3 text-right min-w-[100px] border-r border-slate-800/80 bg-slate-900/60 font-semibold text-slate-300">Talent Cost</th>
              <th className="py-2.5 px-2 text-center min-w-[60px] border-r border-slate-800/60 bg-slate-900/40 font-semibold text-slate-300">Work</th>
              <th className="py-2.5 px-2 text-center min-w-[60px] border-r border-slate-800/80 bg-slate-900/40 font-semibold text-slate-300">Hold</th>
              {daysHeader.map((d) => (
                <th key={d} className="py-2.5 px-2 text-center min-w-[60px]">
                  Day {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {doodMatrix.map((row) => (
              <tr key={row.actor_id} className="hover:bg-slate-800/30 transition-colors">
                <td className="py-2.5 px-3 sticky left-0 bg-slate-900 z-10 border-r border-slate-800">
                  <div className="font-semibold text-white">{row.character_name}</div>
                  <div className="text-[11px] text-slate-400">{row.name}</div>
                </td>

                <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400 bg-slate-900/40 border-r border-slate-800/80 whitespace-nowrap">
                  ${row.talent_cost.toLocaleString()}
                </td>

                <td className="py-2.5 px-2 text-center font-mono font-semibold text-slate-300 bg-slate-900/20 border-r border-slate-800/60">
                  {row.work_days}d
                </td>

                <td className="py-2.5 px-2 text-center font-mono border-r border-slate-800/80">
                  {row.hold_days > 0 ? (
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                      {row.hold_days}d
                    </span>
                  ) : (
                    <span className="text-slate-500">0d</span>
                  )}
                </td>

                {row.day_codes.map((code, idx) => {
                  let pillClass = 'bg-slate-800/40 text-slate-500 border-transparent';
                  if (code === 'W') {
                    pillClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-bold';
                  } else if (code === 'H') {
                    pillClass = 'bg-rose-500/25 text-rose-300 border-rose-500/40 font-black shadow-sm';
                  } else if (code === 'F') {
                    pillClass = 'bg-purple-500/25 text-purple-300 border-purple-500/40 font-bold';
                  }

                  return (
                    <td key={idx} className="py-2.5 px-2 text-center">
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-md border text-xs ${pillClass}`}
                      >
                        {code}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-700 bg-slate-800/30 font-bold">
              <td className="py-3 px-3 text-white sticky left-0 bg-slate-900 z-10 border-r border-slate-800">TOTALS ({doodMatrix.length} Actors)</td>
              <td className="py-3 px-3 text-right text-emerald-400 font-mono text-sm border-r border-slate-800/80">
                ${totalCost.toLocaleString()}
              </td>
              <td className="py-3 px-2 text-center text-slate-300 font-mono border-r border-slate-800/60">{totalWorkDays}d</td>
              <td className="py-3 px-2 text-center text-rose-300 font-mono border-r border-slate-800/80">{totalHoldDays}d</td>
              <td colSpan={numDays}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
