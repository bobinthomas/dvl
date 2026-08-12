import * as React from "react";

const STORAGE_KEY = "ds-standing-questions";

export interface StandingQuestion {
  id: string;
  prompt: string;
  why: string;
}

interface StandingQuestionsState {
  questions: StandingQuestion[];
  addQuestion: (prompt: string, why: string) => void;
  removeQuestion: (id: string) => void;
}

const StandingQuestionsContext = React.createContext<StandingQuestionsState>({
  questions: [],
  addQuestion: () => {},
  removeQuestion: () => {},
});

function loadStoredQuestions(): StandingQuestion[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter(
          (q): q is StandingQuestion =>
            typeof q === "object" && q !== null && typeof q.id === "string" && typeof q.prompt === "string"
        )
      : [];
  } catch {
    return [];
  }
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-+|-+$)/g, "")
      .slice(0, 40) || "question"
  );
}

/**
 * A standing baseline of interview questions the human running this docs
 * site wants asked for every component, regardless of what a given PRD
 * says — e.g. "does this need a loading state?" The promote step always
 * asks these first, then the AI's own PRD-specific questions on top (see
 * mergeStandingQuestions in @ds-platform/agents). Same
 * localStorage-backed, sent-per-request posture as providerContext.tsx —
 * nothing server-side to persist.
 */
export function StandingQuestionsProvider({ children }: { children: React.ReactNode }) {
  const [questions, setQuestions] = React.useState<StandingQuestion[]>(loadStoredQuestions);

  function persist(next: StandingQuestion[]) {
    setQuestions(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function addQuestion(prompt: string, why: string) {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;
    const base = slugify(trimmedPrompt);
    let id = base;
    let suffix = 2;
    const existingIds = new Set(questions.map((q) => q.id));
    while (existingIds.has(id)) {
      id = `${base}-${suffix}`;
      suffix += 1;
    }
    persist([...questions, { id, prompt: trimmedPrompt, why: why.trim() }]);
  }

  function removeQuestion(id: string) {
    persist(questions.filter((q) => q.id !== id));
  }

  return (
    <StandingQuestionsContext.Provider value={{ questions, addQuestion, removeQuestion }}>
      {children}
    </StandingQuestionsContext.Provider>
  );
}

export function useStandingQuestions(): StandingQuestionsState {
  return React.useContext(StandingQuestionsContext);
}
