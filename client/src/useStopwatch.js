import { useCallback, useState } from "react";
import { useInterval } from "./useInterval";

export const useStopwatch = (active) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useInterval(() => {
    if (!active) return;
    setElapsedSeconds((prev) => prev + 1);
  }, 1000);

  const reset = useCallback(() => {
    setElapsedSeconds(0);
  }, []);

  return { elapsedSeconds, reset };
};
