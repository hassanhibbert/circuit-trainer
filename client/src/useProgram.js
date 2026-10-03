import { useCallback, useMemo, useState } from "react";

export const useProgram = (list, initialPosition = 0) => {
  const [position, setPosition] = useState(initialPosition);

  const next = useCallback(() => {
    setPosition((prevPosition) => {
      const nextPosition = prevPosition + 1;
      return nextPosition > list.length - 1 ? prevPosition : nextPosition;
    });
  }, [list]);

  const getNextWorkout = useCallback(() => {
    return list[position + 1];
  }, [position, list]);

  const last = useMemo(() => {
    return position === list.length - 1;
  }, [position, list.length]);

  const reset = useCallback(() => {
    setPosition(0);
  }, []);

  return { next, last, program: list?.[position], position, reset, getNextWorkout };
};
