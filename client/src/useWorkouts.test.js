import { describe, expect, it } from "vitest";
import { toProgram } from "./useWorkouts";
import { lengthLabel, stepsOf } from "./workoutInfo";
import { manualWorkout, timedWorkout } from "./test/fixtures";

describe("toProgram", () => {
  it("turns timed workouts into sections of units with minutes and seconds", () => {
    const program = toProgram(timedWorkout);

    expect(program.type).toBe("timed");
    expect(program.exercises).toBeUndefined();
    expect(program.sections[0].title).toEqual(["Round 1", "Lower Body"]);
    expect(program.sections[0].units[0]).toMatchObject({ title: "Jumping Jacks", minutes: 1, seconds: 30 });
  });

  it("flattens manual workouts into one list of exercises", () => {
    const program = toProgram(manualWorkout);

    expect(program.type).toBe("manual");
    expect(program.exercises.map((e) => e.setLabel)).toEqual(["Set 1 of 2", "Set 2 of 2", null]);
    expect(program.exercises[2]).toMatchObject({ title: "Plank", minutes: 0, seconds: 35, restSeconds: 45 });
  });

  it("leaves minutes and seconds null when there is no duration, so no hold timer shows", () => {
    const swing = toProgram(manualWorkout).exercises[0];

    expect(swing.minutes).toBeNull();
    expect(swing.seconds).toBeNull();
  });

  it("keeps the original response for the editor", () => {
    expect(toProgram(manualWorkout).raw).toBe(manualWorkout);
  });
});

describe("workout info", () => {
  it("counts every step, rests included", () => {
    expect(stepsOf(toProgram(timedWorkout))).toHaveLength(3);
  });

  it("shows minutes for timed workouts and sets for manual ones", () => {
    expect(lengthLabel(toProgram(timedWorkout))).toBe("3 min");
    expect(lengthLabel(toProgram(manualWorkout))).toBe("3 sets");
  });
});
