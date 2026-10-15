import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GoalsPanel } from "./GoalsPanel";
import { AuthContext } from "./AuthContext";

vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, api: { post: vi.fn(), del: vi.fn() }, userTimeZone: () => "America/New_York" };
});
vi.mock("react-toastify", () => ({ toast: { error: vi.fn() } }));

const { api } = await import("./api");

const weightGoal = {
  id: 1,
  type: "TARGET_WEIGHT",
  targetValue: 200,
  startValue: 238.4,
  targetDate: null,
  progress: { currentValue: 227.9, percent: 27, achieved: false },
};

const weeklyGoal = {
  id: 2,
  type: "SESSIONS_PER_WEEK",
  targetValue: 3,
  startValue: null,
  targetDate: null,
  progress: { currentValue: 4, percent: 100, achieved: true },
};

describe("GoalsPanel", () => {
  beforeEach(() => {
    api.post.mockReset();
    api.del.mockReset();
  });

  it("shows progress for each goal", () => {
    render(<GoalsPanel goals={[weightGoal, weeklyGoal]} onChanged={vi.fn()} />);

    expect(screen.getByText("Reach 200.0 lb")).toBeInTheDocument();
    expect(screen.getByText("27%")).toBeInTheDocument();
    expect(screen.getByText(/238\.4 lb → 200\.0 lb · now 227\.9 lb/)).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
    expect(screen.getByText("4 workouts this week, goal was 3")).toBeInTheDocument();
  });

  it("adds a goal in the user's time zone", async () => {
    api.post.mockResolvedValue({});
    const onChanged = vi.fn();
    const user = userEvent.setup();
    render(<GoalsPanel goals={[]} onChanged={onChanged} />);

    await user.click(screen.getByRole("button", { name: "Add goal" }));
    await user.selectOptions(screen.getByLabelText("Goal"), "SESSIONS_PER_WEEK");
    await user.type(screen.getByLabelText("Workouts"), "3");
    await user.click(screen.getAllByRole("button", { name: "Add goal" }).at(-1));

    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(api.post).toHaveBeenCalledWith("/api/v1/goals?tz=America%2FNew_York", {
      type: "SESSIONS_PER_WEEK",
      targetValue: 3,
      targetDate: null,
    });
  });

  it("removes a goal", async () => {
    api.del.mockResolvedValue(null);
    const onChanged = vi.fn();
    const user = userEvent.setup();
    render(<GoalsPanel goals={[weightGoal]} onChanged={onChanged} />);

    await user.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(api.del).toHaveBeenCalledWith("/api/v1/goals/1");
  });

  it("hides adding and removing in the read-only demo", () => {
    render(
      <AuthContext.Provider value={{ user: { username: "Demo Trainer", readOnly: true } }}>
        <GoalsPanel goals={[weightGoal]} onChanged={vi.fn()} />
      </AuthContext.Provider>
    );

    expect(screen.getByText("Reach 200.0 lb")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add goal" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();
  });
});
