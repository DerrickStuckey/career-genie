interface RankingCardProps {
  quality: string;
  onClick: () => void;
  side: 'left' | 'right';
}

export function RankingCard({ quality, onClick, side }: RankingCardProps) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-2xl border-2 border-gray-200 bg-white p-8 text-center transition-all hover:border-blue-400 hover:shadow-lg active:scale-[0.98] ${
        side === 'left' ? 'hover:-rotate-1' : 'hover:rotate-1'
      }`}
    >
      <p className="text-lg font-semibold text-gray-900">{quality}</p>
      <p className="mt-2 text-sm text-gray-500">Click to choose</p>
    </button>
  );
}
