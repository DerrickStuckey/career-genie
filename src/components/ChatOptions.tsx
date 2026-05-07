import type { PresentedOption } from '@/types';

interface ChatOptionsProps {
  options: PresentedOption[];
  onSelect: (title: string) => void;
  disabled: boolean;
  selectedTitle: string | null;
}

export function ChatOptions({ options, onSelect, disabled, selectedTitle }: ChatOptionsProps) {
  if (options.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 mt-1 mb-4 w-full">
      {options.map((option) => {
        const isSelected = disabled && selectedTitle === option.title;
        const isUnselected = disabled && selectedTitle !== option.title;

        return (
          <button
            key={option.title}
            onClick={() => onSelect(option.title)}
            disabled={disabled}
            className={`rounded-xl border px-4 py-3 text-left transition-colors ${
              isSelected
                ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                : isUnselected
                  ? 'border-stone-200 bg-stone-50 text-stone-400 opacity-60'
                  : 'border-stone-300 bg-white text-stone-900 hover:border-emerald-500 hover:bg-emerald-50 cursor-pointer'
            }`}
          >
            <span className="block font-medium text-sm">{option.title}</span>
            <span className={`block text-xs mt-0.5 ${
              isSelected ? 'text-emerald-700' : isUnselected ? 'text-stone-400' : 'text-stone-500'
            }`}>
              {option.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
