import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SetLogger } from "./SetLogger";
import { toProgram } from "./useWorkouts";
import { manualWorkout, timedWorkout } from "./test/fixtures";

vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, api: { get: vi.fn(), put: vi.fn() } };
});
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const { api } = await import("./api");

const session = { id: 9, workoutId: 5, workoutTitle: "Kettlebell Month 1", completedAt: "2026-10-13T10:00:00Z", totalSeconds: 1800 };

const noPreviousSessions = () => api.get.mockResolvedValue({ content: [] });

describe("SetLogger", () => {
  beforeEach(() => {
    api.get.mockReset();
    api.put.mockReset();
  });

  it("prefills reps and hold times from the plan", async () => {
    noPreviousSessions();
    render(<SetLogger program={toProgram(manualWorkout)} session={session} onDone={vi.fn()} />);

    const reps = screen.getAllByLabelText("Swing reps");
    expect(reps).toHaveLength(2);
    expect(reps[0]).toHaveValue(15);
    expect(screen.getByLabelText("Plank seconds")).toHaveValue(35);
  });

  it("prefills weights from the last time the same sets were done", async () => {
    api.get.mockResolvedValue({
      content: [
        { id: 9, sets: [] },
        {
          id: 4,
          sets: [
            { exerciseTitle: "Swing", setLabel: "Set 1 of 2", reps: 15, weightLb: 35 },
            { exerciseTitle: "Swing", setLabel: "Set 2 of 2", reps: 15, weightLb: 40 },
          ],
        },
      ],
    });
    render(<SetLogger program={toProgram(manualWorkout)} session={session} onDone={vi.fn()} />);

    const weights = screen.getAllByLabelText("Swing weight in pounds");
    await waitFor(() => expect(weights[1]).toHaveValue(40));
    expect(weights[0]).toHaveValue(35);
    expect(api.get).toHaveBeenCalledWith("/api/v1/sessions?workoutId=5&size=5");
  });

  it("saves what was entered and skips empty rows", async () => {
    noPreviousSessions();
    api.put.mockResolvedValue({});
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(<SetLogger program={toProgram(manualWorkout)} session={session} onDone={onDone} />);

    const [firstWeight] = screen.getAllByLabelText("Swing weight in pounds");
    await user.type(firstWeight, "35");
    const [, secondReps] = screen.getAllByLabelText("Swing reps");
    await user.clear(secondReps);
    await user.clear(screen.getByLabelText("Plank seconds"));
    await user.type(screen.getByPlaceholderText("How did it feel?"), "felt strong");
    await user.click(screen.getByRole("button", { name: "Save workout" }));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    const [path, body] = api.put.mock.calls[0];
    expect(path).toBe("/api/v1/sessions/9");
    expect(body).toMatchObject({ workoutId: 5, completedAt: session.completedAt, notes: "felt strong" });
    expect(body.sets).toEqual([{ exerciseTitle: "Swing", setLabel: "Set 1 of 2", reps: 15, weightLb: 35, durationSeconds: null }]);
  });

  it("hides the table for timed workouts until asked, and leaves out rest steps", async () => {
    noPreviousSessions();
    const user = userEvent.setup();
    render(<SetLogger program={toProgram(timedWorkout)} session={session} onDone={vi.fn()} />);

    expect(screen.queryByLabelText("Jumping Jacks reps")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /log reps/i }));

    expect(screen.getByLabelText("Jumping Jacks seconds")).toHaveValue(90);
    expect(screen.queryByLabelText("Rest reps")).not.toBeInTheDocument();
  });

  it("explains a workout that was saved offline", async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(<SetLogger program={toProgram(manualWorkout)} session={null} queued onDone={onDone} />);

    expect(screen.getByText(/saved on this device/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Back to workouts" }));
    expect(onDone).toHaveBeenCalled();
    expect(api.get).not.toHaveBeenCalled();
  });

  it("explains that the demo doesn't save workouts", () => {
    render(<SetLogger program={toProgram(manualWorkout)} session={null} demo onDone={vi.fn()} />);

    expect(screen.getByText(/this is the demo/i)).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });
});
