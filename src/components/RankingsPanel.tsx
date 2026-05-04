'use client';

interface RankingsPanelProps {
  rankings: string[];
  onReorder: (newRankings: string[]) => void;
}

export function RankingsPanel({ rankings, onReorder }: RankingsPanelProps) {
  function moveItem(index: number, direction: 'up' | 'down') {
    const newRankings = [...rankings];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newRankings[index], newRankings[swapIndex]] = [newRankings[swapIndex], newRankings[index]];
    onReorder(newRankings);
  }

  if (rankings.length === 0) {
    return <p className="text-sm text-stone-500">No rankings recorded.</p>;
  }

  return (
    <div className="space-y-1">
      {rankings.map((item, i) => (
        <div
          key={item}
          className="flex items-center gap-2 py-2 px-3 rounded-lg bg-white border border-stone-200"
        >
          <span className="text-stone-400 text-sm w-6 text-right shrink-0">{i + 1}.</span>
          <span className="flex-1 text-sm text-stone-900">{item}</span>
          <button
            onClick={() => moveItem(i, 'up')}
            disabled={i === 0}
            className="text-stone-400 hover:text-stone-700 disabled:opacity-25 disabled:hover:text-stone-400 text-sm px-1"
            aria-label={`Move ${item} up`}
          >
            &#9650;
          </button>
          <button
            onClick={() => moveItem(i, 'down')}
            disabled={i === rankings.length - 1}
            className="text-stone-400 hover:text-stone-700 disabled:opacity-25 disabled:hover:text-stone-400 text-sm px-1"
            aria-label={`Move ${item} down`}
          >
            &#9660;
          </button>
        </div>
      ))}
    </div>
  );
}
