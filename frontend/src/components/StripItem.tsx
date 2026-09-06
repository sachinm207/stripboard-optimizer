import React from 'react';
import { Flame, Clock, File, Lock, Unlock, Pin } from 'lucide-react';
import { Scene } from '../types';

interface StripItemProps {
  scene: Scene;
  currentDay?: number;
  totalDays?: number;
  onLockScene?: (sceneId: string, lockedDay: number | null) => void;
}

export const StripItem: React.FC<StripItemProps> = ({
  scene,
  currentDay,
  totalDays = 5,
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
    // EXT NIGHT: Green
    colorClasses = 'bg-emerald-200 text-emerald-950 border-emerald-300 shadow-emerald-950/20';
    badgeClasses = 'bg-emerald-300/80 text-emerald-950';
  } else {
    // INT NIGHT: Blue
    colorClasses = 'bg-sky-200 text-sky-950 border-sky-300 shadow-sky-950/20';
    badgeClasses = 'bg-sky-300/80 text-sky-950';
  }

  // Format page eighths (e.g., 18 -> 2 2/8)
  const fullPages = Math.floor(scene.pages_eighths / 8);
  const remEighths = scene.pages_eighths % 8;
  const pageStr = fullPages > 0 ? (remEighths > 0 ? `${fullPages} ${remEighths}/8` : `${fullPages}`) : `${remEighths}/8`;

  return (
    <div
      draggable={true}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', scene.scene_id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      className={`rounded-md border px-2.5 py-1.5 my-0.5 shadow-sm transition-all hover:scale-[1.008] hover:shadow-md cursor-grab active:cursor-grabbing select-none flex items-center justify-between gap-2 text-xs ${colorClasses}`}
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

      {/* Right: Pyro, Duration, Pages, Pin/Lock Override */}
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

        {/* Interactive Scene Lock / Pin Override */}
        {onLockScene && (
          <div className="flex items-center gap-1 ml-0.5" onClick={(e) => e.stopPropagation()}>
            {scene.locked_day != null ? (
              <div className="flex items-center gap-1 bg-amber-600 text-white px-1.5 py-0.5 rounded text-[10px] font-bold shadow-sm">
                <Lock className="w-2.5 h-2.5" />
                <span>D{scene.locked_day}</span>
                <button
                  onClick={() => onLockScene(scene.scene_id, null)}
                  title="Unlock scene (allow optimizer to move)"
                  className="ml-0.5 text-amber-200 hover:text-white"
                >
                  ✕
                </button>
              </div>
            ) : (
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    onLockScene(scene.scene_id, parseInt(e.target.value, 10));
                  }
                }}
                className="text-[10px] font-semibold bg-black/10 hover:bg-black/20 text-slate-900 rounded px-1.5 py-0.5 border border-black/15 cursor-pointer outline-none transition-colors"
                title="Lock scene to day (or drag-and-drop to any day card)"
              >
                <option value="" disabled>
                  📌 Pin...
                </option>
                {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    Day {d} {d === currentDay ? '(Current)' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
