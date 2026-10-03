import { useCallback, useRef } from "react";

const PEAK_GAIN = 0.5;
const ATTACK_SECONDS = 0.015;
const RELEASE_SECONDS = 0.15;

export const useCue = () => {
  const audioCtxRef = useRef(null);

  const play = useCallback((duration = 0.3) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      const startTime = ctx.currentTime;
      const releaseStart = Math.max(
        startTime + duration - RELEASE_SECONDS,
        startTime + ATTACK_SECONDS
      );

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(PEAK_GAIN, startTime + ATTACK_SECONDS);
      gain.gain.setValueAtTime(PEAK_GAIN, releaseStart);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.start(startTime);
      osc.stop(startTime + duration);
    } catch (err) {
      console.warn("Cue audio failed:", err);
    }

    if (navigator.vibrate) {
      navigator.vibrate(Math.round(Math.min(duration, 1) * 500));
    }
  }, []);

  return { play };
};
