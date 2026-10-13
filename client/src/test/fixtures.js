// API-shaped workouts, the same shape GET /api/v1/workouts returns
export const timedWorkout = {
  id: 1,
  title: "Beginner HIIT",
  description: "<p>Hi</p>",
  mode: "TIMED",
  sessionsPerWeek: null,
  programWeeks: null,
  builtIn: true,
  sections: [
    {
      id: 10,
      titleLines: ["Round 1", "Lower Body"],
      exercises: [
        { id: 100, title: "Jumping Jacks", modifier: null, setLabel: null, reps: null, targetReps: null, durationSeconds: 90, restSeconds: null },
        { id: 101, title: "Rest", modifier: null, setLabel: null, reps: null, targetReps: null, durationSeconds: 30, restSeconds: null },
      ],
    },
    {
      id: 11,
      titleLines: [],
      exercises: [
        { id: 102, title: "Squats", modifier: "or goblet", setLabel: null, reps: null, targetReps: null, durationSeconds: 60, restSeconds: null },
      ],
    },
  ],
};

export const manualWorkout = {
  id: 5,
  title: "Kettlebell Month 1",
  description: null,
  mode: "MANUAL",
  sessionsPerWeek: 3,
  programWeeks: 4,
  builtIn: false,
  sections: [
    {
      id: 20,
      titleLines: [],
      exercises: [
        { id: 200, title: "Swing", modifier: null, setLabel: "Set 1 of 2", reps: "15 reps", targetReps: 15, durationSeconds: null, restSeconds: 60 },
        { id: 201, title: "Swing", modifier: null, setLabel: "Set 2 of 2", reps: "15 reps", targetReps: 15, durationSeconds: null, restSeconds: 60 },
        { id: 202, title: "Plank", modifier: null, setLabel: null, reps: "30-40s hold", targetReps: null, durationSeconds: 35, restSeconds: 45 },
      ],
    },
  ],
};
