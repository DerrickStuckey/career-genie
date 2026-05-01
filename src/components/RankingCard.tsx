interface RankingCardProps {
  quality: string;
  onClick: () => void;
  side: 'left' | 'right';
}

export function RankingCard({ quality, onClick, side }: RankingCardProps) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-2xl border-2 border-stone-200 bg-white p-8 text-center transition-all hover:border-emerald-400 hover:shadow-lg active:scale-[0.98] ${
        side === 'left' ? 'hover:-rotate-1' : 'hover:rotate-1'
      }`}
    >
      <p className="text-lg font-semibold text-stone-900">{quality}</p>
      <p className="mt-2 text-sm text-stone-500">Click to choose</p>
    </button>
  );
}
