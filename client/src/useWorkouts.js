import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "./api";

const splitDuration = (totalSeconds) =>
  totalSeconds == null
    ? { minutes: null, seconds: null }
    : { minutes: Math.floor(totalSeconds / 60), seconds: totalSeconds % 60 };

const toStep = (exercise) => ({
  id: exercise.id,
  title: exercise.title,
  modifier: exercise.modifier,
  setLabel: exercise.setLabel,
  reps: exercise.reps,
  targetReps: exercise.targetReps,
  restSeconds: exercise.restSeconds,
  durationSeconds: exercise.durationSeconds,
  ...splitDuration(exercise.durationSeconds),
});

// Adapts the API's workout to the shape the timer screens were written for (the old bundled
// JSON): timed workouts as sections[].units[], manual ones as a flat exercises[] list.
export const toProgram = (workout) => {
  const manual = workout.mode === "MANUAL";
  return {
    id: workout.id,
    title: workout.title,
    description: workout.description,
    builtIn: workout.builtIn,
    mode: workout.mode,
    type: manual ? "manual" : "timed",
    sessionsPerWeek: workout.sessionsPerWeek,
    programWeeks: workout.programWeeks,
    sections: workout.sections.map((section) => ({
      id: section.id,
      title: section.titleLines,
      units: section.exercises.map(toStep),
    })),
    exercises: manual ? workout.sections.flatMap((s) => s.exercises.map(toStep)) : undefined,
    raw: workout,
  };
};

export const useWorkouts = () => {
  const [workouts, setWorkouts] = useState(null);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    try {
      const list = await api.get("/api/v1/workouts");
      setWorkouts(list.map(toProgram));
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const save = useCallback(
    async (id, request) => {
      const saved = id
        ? await api.put(`/api/v1/workouts/${id}`, request)
        : await api.post("/api/v1/workouts", request);
      await reload();
      return toProgram(saved);
    },
    [reload]
  );

  const copy = useCallback(
    async (id) => {
      const copied = await api.post(`/api/v1/workouts/${id}/copy`);
      await reload();
      return toProgram(copied);
    },
    [reload]
  );

  const remove = useCallback(
    async (id) => {
      await api.del(`/api/v1/workouts/${id}`);
      await reload();
    },
    [reload]
  );

  return { workouts, error, reload, save, copy, remove };
};
