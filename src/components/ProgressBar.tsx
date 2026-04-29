interface ProgressBarProps {
  current: number;
  total: number;
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="w-full">
      <div className="flex justify-between text-sm text-stone-600 mb-1">
        <span>{current} of {total} comparisons</span>
        <span>{percentage}%</span>
      </div>
      <div className="w-full bg-stone-200 rounded-full h-2">
        <div
          className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
