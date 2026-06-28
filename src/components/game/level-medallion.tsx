import { cn, getLevelProgress } from "@/lib/utils";

export function LevelMedallion({ level, xp, className }: { level: number; xp: number; className?: string }) {
  const progress = getLevelProgress(xp);
  const gradientId = `levelGradient-${level}-${xp}`;

  return (
    <div className={cn("relative grid h-20 w-20 place-items-center", className)}>
      <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="9" className="text-muted" fill="none" />
        <circle cx="50" cy="50" r="42" stroke={`url(#${gradientId})`} strokeWidth="9" strokeLinecap="round" fill="none" strokeDasharray={`${progress * 2.64} 264`} />
        <defs>
          <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#ffe7a3" />
            <stop offset="52%" stopColor="#f1bd59" />
            <stop offset="100%" stopColor="#63b7ff" />
          </linearGradient>
        </defs>
      </svg>
      <div className="grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/20">
        <span className="text-[10px] font-black uppercase tracking-widest">Lvl</span>
        <span className="-mt-2 text-2xl font-black">{level}</span>
      </div>
    </div>
  );
}
