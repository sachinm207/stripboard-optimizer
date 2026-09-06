import React from 'react';
import { Flame, Clock, File, Lock } from 'lucide-react';
import { Scene } from '../types';

interface StripItemProps {
  scene: Scene;
  currentDay?: number;
  totalDays?: number;
  onMoveScene?: (sceneId: string, targetDay: number) => void;
  onLockScene?: (sceneId: string, lockedDay: number | null) => void;
}

export const StripItem: React.FC<StripItemProps> = ({
  scene,
  currentDay,
  totalDays = 5,
  onMoveScene,
  onLockScene,
}) => {
  // Normalize setting for Hollywood colors
  const settingStr = scene.setting.toUpperCase();
  const isNight = settingStr.includes('NIGHT');
  const isExt = settingStr.includes('EXT');

  let colorClasses = '';
  let badgeClasses = '';

  if (isExt && !isNight) {
    // EXT DAY: Yellow
    colorClasses = 'bg-amber-200 text-amber-950 border-amber-300 shadow-amber-950/20';
    badgeClasses = 'bg-amber-300/80 text-amber-950';
  } else if (!isExt && !isNight) {
    // INT DAY: White / Pale Gray
    colorClasses = 'bg-slate-100 text-slate-900 border-slate-300 shadow-slate-950/20';
    badgeClasses = 'bg-slate-200 text-slate-800';
  } else if (isExt && isNight) {
    // EXT NIGHT: Violet (deeper shade)
    colorClasses = 'bg-violet-400 text-slate-950 border-violet-500 shadow-violet-950/20';
    badgeClasses = 'bg-violet-500/40 text-slate-950';
  } else {
    // INT NIGHT: Blue (deeper shade)
    colorClasses = 'bg-blue-400 text-slate-950 border-blue-500 shadow-blue-950/20';
    badgeClasses = 'bg-blue-500/40 text-slate-950';
  }

  // Format page eighths (e.g., 18 -> 2 2/8)
  const fullPages = Math.floor(scene.pages_eighths / 8);
  const remEighths = scene.pages_eighths % 8;
  const pageStr = fullPages > 0 ? (remEighths > 0 ? `${fullPages} ${remEighths}/8` : `${fullPages}`) : `${remEighths}/8`;

  return (
    <div
      className={`rounded-md border px-2.5 py-1.5 my-0.5 shadow-sm transition-all select-none flex items-center justify-between gap-2 text-xs ${colorClasses}`}
    >
      {/* Left & Middle: Scene #, Slugline, Description, and Cast in the main row */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {/* Scene Number */}
        <span className="w-6 h-6 rounded bg-black/15 flex items-center justify-center font-black text-xs shrink-0 font-mono">
          {scene.scene_number}
        </span>

        {/* Slugline */}
        <span className="font-bold text-xs tracking-tight uppercase font-mono shrink-0">
          {scene.slugline}
        </span>

        {/* Short Description */}
        {scene.description && (
          <span className="hidden xl:inline text-[11px] opacity-70 truncate max-w-[200px]">
            {scene.description}
          </span>
        )}

        {/* Cast ID Pills (INLINE ON MAIN ROW) */}
        {scene.cast_ids && scene.cast_ids.length > 0 && (
          <div className="hidden sm:flex items-center gap-1 shrink-0 ml-1">
            <span className="text-[9px] uppercase font-bold opacity-60">Cast:</span>
            {scene.cast_ids.map((castId) => (
              <span
                key={castId}
                className="px-1.5 py-0.2 rounded bg-black/10 text-[9px] font-bold tracking-tight"
              >
                {castId.replace('ACTOR_', '')}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Right: Pyro, Duration, Pages, Move/Lock Controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        {scene.requires_pyro && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-600 text-white text-[9px] font-bold uppercase tracking-wider animate-pulse">
            <Flame className="w-2.5 h-2.5" /> Pyro
          </span>
        )}

        <span className={`hidden md:flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${badgeClasses}`}>
          <File className="w-2.5 h-2.5" /> {pageStr} pgs
        </span>

        <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${badgeClasses}`}>
          <Clock className="w-2.5 h-2.5" /> {scene.est_shoot_minutes}m
        </span>

        {/* Move / Lock Controls */}
        {(onMoveScene || onLockScene) && (
          <div className="flex items-center gap-1.5 ml-0.5" onClick={(e) => e.stopPropagation()}>
            {scene.locked_day != null ? (
              <div className="flex items-center gap-1 bg-amber-600 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-sm">
                <Lock className="w-2.5 h-2.5" />
                <span>Locked: Day {scene.locked_day}</span>
                {onLockScene && (
                  <button
                    onClick={() => onLockScene(scene.scene_id, null)}
                    title="Unlock scene (allow optimizer to move)"
                    className="ml-1 text-amber-200 hover:text-white font-bold cursor-pointer"
                  >
                    Unlock ✕
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* 1-click Lock to Current Day Button */}
                {onLockScene && currentDay != null && (
                  <button
                    onClick={() => onLockScene(scene.scene_id, currentDay)}
                    title={`Lock scene to Day ${currentDay} (hard constraint)`}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/10 hover:bg-amber-600 hover:text-white text-slate-900 border border-black/15 text-[10px] font-bold transition-all cursor-pointer"
                  >
                    <Lock className="w-2.5 h-2.5" />
                    <span>Lock</span>
                  </button>
                )}

                {/* Dropdown for Move (Flexible) or Lock (Fixed) to any day */}
                <select
                  value=""
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) return;
                    const [action, dayStr] = val.split(':');
                    const target = parseInt(dayStr, 10);
                    if (action === 'lock' && onLockScene) {
                      onLockScene(scene.scene_id, target);
                    } else if (action === 'move' && onMoveScene) {
                      onMoveScene(scene.scene_id, target);
                    }
                  }}
                  className="text-[10px] font-semibold bg-black/10 hover:bg-black/20 text-slate-900 rounded px-1.5 py-0.5 border border-black/15 cursor-pointer outline-none transition-colors"
                  title="Move flexibly or Lock to a specific day"
                >
                  <option value="" disabled>
                    Move / Lock...
                  </option>
                  <optgroup label="Move (Flexible)">
                    {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => (
                      <option key={`move-${d}`} value={`move:${d}`}>
                        Move to Day {d} {d === currentDay ? '(Current)' : ''}
                      </option>
                    ))}
                  </optgroup>
                  {onLockScene && (
                    <optgroup label="🔒 Lock to Day (Fixed)">
                      {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => (
                        <option key={`lock-${d}`} value={`lock:${d}`}>
                          🔒 Lock to Day {d} {d === currentDay ? '(Current)' : ''}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
