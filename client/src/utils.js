export const getFormattedCountdown = (minutes, seconds) => {
  const formattedMinutes = minutes?.toString().padStart(2, "0");
  const formattedSeconds = seconds?.toString().padStart(2, "0");
  return `${formattedMinutes}:${formattedSeconds}`;
};

// Cue tone duration for a given "seconds remaining until target" value:
// short beeps at 3-2-1, one long tone exactly at the target, silence otherwise.
export const getCueDuration = (secondsRemaining) => {
  if (secondsRemaining === 0) return 1.5;
  if (secondsRemaining >= 1 && secondsRemaining <= 3) return 0.3;
  return null;
};
