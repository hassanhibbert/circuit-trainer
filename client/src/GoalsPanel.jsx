import { useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import { api, errorMessage, userTimeZone } from "./api";
import { Badge, Button, Card, CardTitle, Input, Label, Muted, ProgressBar, Select, formatLb } from "./ui";

const describe = (goal) => {
  const p = goal.progress;
  if (goal.type === "SESSIONS_PER_WEEK") {
    const done = Number(p.currentValue ?? 0);
    const target = Number(goal.targetValue);
    return done > target ? `${done} workouts this week, goal was ${target}` : `${done} of ${target} workouts this week`;
  }
  if (p.currentValue == null) return `Target ${formatLb(goal.targetValue)}. Log a weigh-in to track progress.`;
  return `${formatLb(goal.startValue)} → ${formatLb(goal.targetValue)} · now ${formatLb(p.currentValue)}`;
};

export const GoalsPanel = ({ goals, onChanged }) => {
  const [type, setType] = useState("TARGET_WEIGHT");
  const [targetValue, setTargetValue] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
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
      setAdding(false);
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
      <CardHeader>
        <CardTitle>Goals</CardTitle>
        {!adding && (
          <Button $variant="ghost" $size="sm" onClick={() => setAdding(true)}>
            Add goal
          </Button>
        )}
      </CardHeader>
      {goals.length === 0 && !adding && <Muted>Set a target weight or how many workouts you want each week.</Muted>}
      {goals.map((goal) => (
        <Goal key={goal.id}>
          <GoalHeader>
            <strong>
              {goal.type === "TARGET_WEIGHT" ? "Reach " + formatLb(goal.targetValue) : `${Number(goal.targetValue)} workouts a week`}
            </strong>
            {goal.progress.achieved ? <Badge $accent>Done</Badge> : goal.progress.percent != null && <Badge>{goal.progress.percent}%</Badge>}
          </GoalHeader>
          <ProgressBar
            $percent={goal.progress.percent}
            role="progressbar"
            aria-valuenow={goal.progress.percent ?? 0}
            aria-valuemin={0}
            aria-valuemax={100}
          />
          <GoalFooter>
            <Muted as="span">
              {describe(goal)}
              {goal.targetDate && ` · by ${new Date(`${goal.targetDate}T00:00:00`).toLocaleDateString()}`}
            </Muted>
            <RemoveButton onClick={() => handleDelete(goal.id)}>Remove</RemoveButton>
          </GoalFooter>
        </Goal>
      ))}
      {adding && (
        <Form onSubmit={handleSubmit}>
          <Label className="wide">
            Goal
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="TARGET_WEIGHT">Reach a weight</option>
              <option value="SESSIONS_PER_WEEK">Workouts per week</option>
            </Select>
          </Label>
          <Label>
            {type === "SESSIONS_PER_WEEK" ? "Workouts" : "Target (lb)"}
            <Input
              type="number"
              inputMode="decimal"
              step={type === "SESSIONS_PER_WEEK" ? 1 : 0.1}
              min={type === "SESSIONS_PER_WEEK" ? 1 : 50}
              max={type === "SESSIONS_PER_WEEK" ? 21 : 1000}
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              required
            />
          </Label>
          <Label>
            By (optional)
            <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </Label>
          <FormButtons className="wide">
            <Button type="button" $variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button type="submit" $variant="primary" disabled={saving}>
              Add goal
            </Button>
          </FormButtons>
        </Form>
      )}
    </Card>
  );
};

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;

  h2 {
    margin-bottom: 14px;
  }
`;

const Goal = styled.div`
  padding: 12px 0;
  border-top: 1px solid var(--border);
`;

const GoalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
`;

const GoalFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  margin-top: 8px;
`;

const RemoveButton = styled.button`
  background: none;
  border: none;
  padding: 0;
  color: var(--muted);
  font-size: 0.85rem;
  font-weight: 600;

  &:hover {
    color: var(--danger);
  }
`;

const Form = styled.form`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding-top: 14px;
  border-top: 1px solid var(--border);

  .wide {
    grid-column: 1 / -1;
  }
`;

const FormButtons = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`;
