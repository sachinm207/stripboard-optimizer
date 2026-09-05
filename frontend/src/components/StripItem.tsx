import React from 'react';
import { Flame, Clock, File } from 'lucide-react';
import { Scene } from '../types';

interface StripItemProps {
  scene: Scene;
}

export const StripItem: React.FC<StripItemProps> = ({ scene }) => {
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
      className={`rounded-lg border px-3 py-2.5 my-1.5 shadow transition-all hover:scale-[1.01] hover:shadow-md cursor-grab active:cursor-grabbing ${colorClasses}`}
    >
      <div className="flex items-center justify-between gap-2">
        {/* Scene Number & Slugline */}
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-7 h-7 rounded-md bg-black/15 flex items-center justify-center font-black text-sm tracking-tight shrink-0 font-mono">
            {scene.scene_number}
          </span>
          <div className="min-w-0">
            <h4 className="font-bold text-xs md:text-sm tracking-tight truncate uppercase font-mono">
              {scene.slugline}
            </h4>
            <p className="text-[11px] opacity-80 truncate">{scene.description}</p>
          </div>
        </div>

        {/* Badges & Metrics */}
        <div className="flex items-center gap-2 shrink-0">
          {scene.requires_pyro && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider animate-pulse">
              <Flame className="w-3 h-3" /> Pyro
            </span>
          )}

          <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${badgeClasses}`}>
            <Clock className="w-3 h-3" /> {scene.est_shoot_minutes}m
          </span>

          <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${badgeClasses}`}>
            <File className="w-3 h-3" /> {pageStr} pgs
          </span>
        </div>
      </div>

      {/* Cast ID Pills */}
      {scene.cast_ids && scene.cast_ids.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-1.5 border-t border-black/10">
          <span className="text-[10px] uppercase font-bold opacity-70">Cast:</span>
          {scene.cast_ids.map((castId) => (
            <span
              key={castId}
              className="px-1.5 py-0.2 rounded bg-black/10 text-[10px] font-semibold tracking-tight"
            >
              {castId.replace('ACTOR_', '')}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
