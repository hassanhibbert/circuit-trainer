import { useCallback, useState } from "react";

const STORAGE_KEY = "circuit-trainer:history";

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export const useWorkoutHistory = () => {
  const [history, setHistory] = useState(loadHistory);

  const recordCompletion = useCallback((workoutTitle, totalSeconds) => {
    setHistory((prev) => {
      const next = [
        ...prev,
        { workoutTitle, completedAt: new Date().toISOString(), totalSeconds },
      ];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // storage unavailable -- history just won't persist across reloads
      }
      return next;
    });
  }, []);

  const getStatsFor = useCallback(
    (workoutTitle, { sessionsPerWeek, programWeeks } = {}) => {
      const entries = history.filter((h) => h.workoutTitle === workoutTitle);
      const timesCompleted = entries.length;
      const lastCompletedAt = entries.at(-1)?.completedAt ?? null;
      const currentWeek =
        sessionsPerWeek && programWeeks && timesCompleted > 0
          ? Math.min(
              programWeeks,
              Math.floor(timesCompleted / sessionsPerWeek) + 1
            )
          : null;
      return { timesCompleted, lastCompletedAt, currentWeek };
    },
    [history]
  );

  const exportHistory = useCallback(() => {
    const blob = new Blob([JSON.stringify(history, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `circuit-trainer-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [history]);

  const isValidEntry = (entry) =>
    entry &&
    typeof entry.workoutTitle === "string" &&
    typeof entry.completedAt === "string" &&
    typeof entry.totalSeconds === "number";

  const importHistory = useCallback(
    (file) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          let parsed;
          try {
            parsed = JSON.parse(reader.result);
          } catch {
            reject(new Error("Couldn't read that file as JSON."));
            return;
          }
          if (!Array.isArray(parsed)) {
            reject(new Error("Backup file isn't a valid history export."));
            return;
          }
          const valid = parsed.filter(isValidEntry);
          if (valid.length === 0) {
            reject(new Error("Backup file has no valid entries."));
            return;
          }
          const existingKeys = new Set(
            history.map((h) => `${h.workoutTitle}|${h.completedAt}`)
          );
          const newEntries = valid.filter(
            (h) => !existingKeys.has(`${h.workoutTitle}|${h.completedAt}`)
          );
          const next = [...history, ...newEntries].sort(
            (a, b) => new Date(a.completedAt) - new Date(b.completedAt)
          );
          setHistory(next);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          } catch {
            // storage unavailable -- import applied in memory for this session only
          }
          resolve({ added: newEntries.length, skipped: valid.length - newEntries.length });
        };
        reader.onerror = () => reject(new Error("Couldn't read that file."));
        reader.readAsText(file);
      }),
    [history]
  );

  return {
    recordCompletion,
    getStatsFor,
    exportHistory,
    importHistory,
    historyCount: history.length,
  };
};
