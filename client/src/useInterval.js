import { useEffect, useRef } from "react";

export const useInterval = (fn, delay = 0) => {
  const savedFn = useRef(fn);

  useEffect(() => {
    savedFn.current = fn;
  }, [fn]);

  useEffect(() => {
    const intervalId = setInterval(() => savedFn.current(), delay);
    return () => {
      clearInterval(intervalId);
    };
  }, [delay]);
};
