import type { QuestionResponse } from '@/types';

interface AnswersPanelProps {
  questionResponses: QuestionResponse[];
}

export function AnswersPanel({ questionResponses }: AnswersPanelProps) {
  const answered = questionResponses.filter((qr) => qr.answer.trim());

  if (answered.length === 0) {
    return <p className="text-sm text-stone-500">No answers recorded.</p>;
  }

  return (
    <div className="space-y-4">
      {answered.map((qr) => (
        <div key={qr.questionId} className="border-b border-stone-200 pb-3 last:border-0">
          <p className="text-sm font-medium text-stone-700">{qr.question}</p>
          <p className="text-sm text-stone-900 mt-1">{qr.answer}</p>
          {qr.whyAnswer.trim() && (
            <p className="text-sm text-stone-500 mt-1">
              <span className="font-medium">Why:</span> {qr.whyAnswer}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
