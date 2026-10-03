import { useCallback, useEffect, useRef } from "react";

export const useWakeLock = () => {
  const wakeLockRef = useRef(null);

  const request = useCallback(async () => {
    try {
      wakeLockRef.current = await navigator.wakeLock.request("screen");
    } catch (err) {
      console.warn("Wake Lock request failed:", err);
    }
  }, []);

  const release = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().then(() => {
        wakeLockRef.current = null;
      });
    }
  }, []);

  useEffect(() => {
    return () => {
      release();
    };
  }, [release]);

  return { request, release };
};
