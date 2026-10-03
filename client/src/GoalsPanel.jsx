import { useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import { api, errorMessage, userTimeZone } from "./api";
import { Card, CardTitle, DangerButton, Input, Label, Muted, PrimaryButton, ProgressBar, Row, Select, formatLb } from "./ui";

const describe = (goal) => {
  const p = goal.progress;
  if (goal.type === "SESSIONS_PER_WEEK") {
    return `${p.currentValue ?? 0} of ${Number(goal.targetValue)} workouts this week`;
  }
  if (p.currentValue == null) return `Target ${formatLb(goal.targetValue)}. Log a weigh-in to track progress.`;
  return `${formatLb(goal.startValue)} → ${formatLb(goal.targetValue)} · now ${formatLb(p.currentValue)}`;
};

export const GoalsPanel = ({ goals, onChanged }) => {
  const [type, setType] = useState("TARGET_WEIGHT");
  const [targetValue, setTargetValue] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [saving, setSaving] = useState(false);
  const tz = encodeURIComponent(userTimeZone());

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post(`/api/v1/goals?tz=${tz}`, {
        type,
        targetValue: Number(targetValue),
        targetDate: targetDate || null,
      });
      setTargetValue("");
      setTargetDate("");
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.del(`/api/v1/goals/${id}`);
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <Card>
      <CardTitle>Goals</CardTitle>
      {goals.length === 0 && <Muted>No goals yet. Set a target weight or a weekly workout count.</Muted>}
      {goals.map((goal) => (
        <Goal key={goal.id}>
          <GoalHeader>
            <strong>
              {goal.type === "TARGET_WEIGHT" ? "Reach " + formatLb(goal.targetValue) : `${Number(goal.targetValue)}× per week`}
              {goal.progress.achieved && " ✓"}
            </strong>
            <DangerButton onClick={() => handleDelete(goal.id)} aria-label="Delete goal">
              ×
            </DangerButton>
          </GoalHeader>
          <ProgressBar $percent={goal.progress.percent} role="progressbar" aria-valuenow={goal.progress.percent ?? 0} aria-valuemin={0} aria-valuemax={100} />
          <Muted>
            {describe(goal)}
            {goal.progress.percent != null && ` · ${goal.progress.percent}%`}
            {goal.targetDate && ` · by ${new Date(`${goal.targetDate}T00:00:00`).toLocaleDateString()}`}
          </Muted>
        </Goal>
      ))}
      <form onSubmit={handleSubmit}>
        <Row>
          <Label>
            New goal
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="TARGET_WEIGHT">Target weight (lb)</option>
              <option value="SESSIONS_PER_WEEK">Workouts per week</option>
            </Select>
          </Label>
          <Label>
            Target
            <Input
              type="number"
              inputMode="decimal"
              step={type === "SESSIONS_PER_WEEK" ? 1 : 0.1}
              min={type === "SESSIONS_PER_WEEK" ? 1 : 50}
              max={type === "SESSIONS_PER_WEEK" ? 21 : 1000}
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              required
              style={{ width: "6em" }}
            />
          </Label>
          <Label>
            By (optional)
            <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </Label>
          <PrimaryButton type="submit" disabled={saving}>
            Add
          </PrimaryButton>
        </Row>
      </form>
    </Card>
  );
};

const Goal = styled.div`
  margin-bottom: 14px;
`;

const GoalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
`;
