import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkoutList } from "./WorkoutList";
import { toProgram } from "./useWorkouts";
import { manualWorkout, timedWorkout } from "./test/fixtures";

const setup = (workouts, stats = {}) => {
  const handlers = { onOpen: vi.fn(), onCopy: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn(), onNew: vi.fn() };
  render(<WorkoutList workouts={workouts} getStatsFor={(p) => stats[p.id] ?? null} {...handlers} />);
  return { handlers, user: userEvent.setup() };
};

const card = (title) => screen.getByRole("heading", { name: title }).closest("article");

describe("WorkoutList", () => {
  it("shows mode, length and the program week", () => {
    setup([toProgram(timedWorkout), toProgram(manualWorkout)], {
      5: { timesCompleted: 7, lastCompletedAt: "2026-10-12T10:00:00Z", currentWeek: 3 },
    });

    const kettlebell = within(card("Kettlebell Month 1"));
    expect(kettlebell.getByText("Self-paced")).toBeInTheDocument();
    expect(kettlebell.getByText("3 sets")).toBeInTheDocument();
    expect(kettlebell.getByText("Week 3 of 4")).toBeInTheDocument();
    expect(kettlebell.getByText(/7 done/)).toBeInTheDocument();
    expect(within(card("Beginner HIIT")).getByText("Not started yet")).toBeInTheDocument();
  });

  it("offers copy on built-ins and edit or delete on your own", async () => {
    const { handlers, user } = setup([toProgram(timedWorkout), toProgram(manualWorkout)]);

    await user.click(within(card("Beginner HIIT")).getByRole("button", { name: "Copy" }));
    await user.click(within(card("Kettlebell Month 1")).getByRole("button", { name: "Delete" }));

    expect(handlers.onCopy).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    expect(handlers.onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 5 }));
    // the buttons sit inside a clickable card, they must not open it too
    expect(handlers.onOpen).not.toHaveBeenCalled();
    expect(within(card("Beginner HIIT")).queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("opens a workout when the card is clicked", async () => {
    const { handlers, user } = setup([toProgram(timedWorkout)]);

    await user.click(screen.getByRole("heading", { name: "Beginner HIIT" }));

    expect(handlers.onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });

  it("nudges you to make a workout when you have none", async () => {
    const { handlers, user } = setup([toProgram(timedWorkout)]);

    expect(screen.getByText(/build your own/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "New" }));
    expect(handlers.onNew).toHaveBeenCalled();
  });

  it("offers no copy, edit, delete or new in the read-only demo", () => {
    const handlers = { onOpen: vi.fn(), onCopy: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn(), onNew: vi.fn() };
    render(<WorkoutList workouts={[toProgram(timedWorkout), toProgram(manualWorkout)]} readOnly getStatsFor={() => null} {...handlers} />);

    expect(screen.queryByRole("button", { name: /copy|edit|delete|new/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Beginner HIIT" })).toBeInTheDocument();
  });
});
