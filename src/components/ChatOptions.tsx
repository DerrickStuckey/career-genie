import type { PresentedOption } from '@/types';

interface ChatOptionsProps {
  options: PresentedOption[];
  onSelect: (title: string) => void;
  disabled: boolean;
  selectedTitle: string | null;
}

export function ChatOptions({ options, onSelect, disabled, selectedTitle }: ChatOptionsProps) {
  return (
    <div className="flex flex-col gap-2 my-3 ml-4">
      {options.map((option) => {
        const isSelected = selectedTitle === option.title;
        const isDisabledUnselected = disabled && !isSelected;

        return (
          <button
            key={option.title}
            onClick={() => onSelect(option.title)}
            disabled={disabled}
            className={`text-left px-4 py-3 rounded-lg border transition-colors ${
              isSelected
                ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                : isDisabledUnselected
                  ? 'border-stone-200 bg-stone-50 opacity-50 cursor-default'
                  : 'border-stone-300 bg-white hover:border-emerald-400 hover:bg-emerald-50 cursor-pointer'
            }`}
          >
            <span className="font-medium">{option.title}</span>
            <span className="block text-xs text-stone-500 mt-0.5">{option.description}</span>
          </button>
        );
      })}
    </div>
  );
}
