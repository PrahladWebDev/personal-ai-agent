const DEFAULT_QUESTIONS = [
  'What projects has he built?',
  'What are his strongest skills?',
  'What backend technologies does he use?',
  'Tell me about his latest project.',
  'Where can I find his GitHub?',
];

export function SuggestedQuestions({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {DEFAULT_QUESTIONS.map((q) => (
        <button
          key={q}
          onClick={() => onPick(q)}
          className="rounded-full border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-900 transition"
        >
          {q}
        </button>
      ))}
    </div>
  );
}
