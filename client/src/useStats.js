import { useCallback, useEffect, useMemo, useState } from "react";
import { api, userTimeZone } from "./api";

export const useStats = () => {
  const [stats, setStats] = useState(null);

  const refresh = useCallback(async () => {
    try {
      setStats(await api.get(`/api/v1/stats?tz=${encodeURIComponent(userTimeZone())}`));
    } catch {
      // stats are optional
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const byWorkoutId = useMemo(
    () => new Map((stats?.workouts ?? []).map((s) => [s.workoutId, s])),
    [stats]
  );

  const getStatsFor = useCallback((program) => byWorkoutId.get(program.id) ?? null, [byWorkoutId]);

  return { stats, refresh, getStatsFor };
};
