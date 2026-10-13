import { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import { api, errorMessage } from "./api";
import { WeightChart } from "./WeightChart";
import { Button, Card, CardTitle, Input, Label, Muted, formatLb, localToday } from "./ui";
import { CloseIcon } from "./icons";

const daysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
};

export const WeightPanel = ({ onChanged }) => {
  const [entries, setEntries] = useState([]);
  const [measuredOn, setMeasuredOn] = useState(localToday);
  const [weightLb, setWeightLb] = useState("");
  const [saving, setSaving] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    try {
      const page = await api.get(`/api/v1/weights?from=${daysAgo(180)}&size=100&sort=measuredOn,desc`);
      setEntries(page.content);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      // same day updates the existing entry
      const existing = entries.find((e) => e.measuredOn === measuredOn);
      const body = { measuredOn, weightLb: Number(weightLb) };
      if (existing) await api.put(`/api/v1/weights/${existing.id}`, body);
      else await api.post("/api/v1/weights", body);
      setWeightLb("");
      await load();
      onChanged?.();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.del(`/api/v1/weights/${id}`);
      await load();
      onChanged?.();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <Card>
      <CardTitle>Body weight</CardTitle>
      <Form onSubmit={handleSubmit}>
        <Label>
          Date
          <Input type="date" value={measuredOn} max={localToday()} onChange={(e) => setMeasuredOn(e.target.value)} required />
        </Label>
        <Label>
          Weight (lb)
          <Input
            type="number"
            inputMode="decimal"
            step="0.1"
            min="50"
            max="1000"
            value={weightLb}
            onChange={(e) => setWeightLb(e.target.value)}
            required
          />
        </Label>
        <Button type="submit" $variant="primary" disabled={saving}>
          Log
        </Button>
      </Form>
      {entries.length === 0 ? (
        <Muted>No weigh-ins yet. Log one to start your trend.</Muted>
      ) : (
        <>
          <WeightChart entries={entries} />
          <List>
            {entries.slice(0, showAll ? entries.length : 5).map((entry) => (
              <li key={entry.id}>
                <span>
                  {new Date(`${entry.measuredOn}T00:00:00`).toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <strong>{formatLb(entry.weightLb)}</strong>
                <DeleteButton onClick={() => handleDelete(entry.id)} aria-label={`Delete ${entry.measuredOn}`}>
                  <CloseIcon size={14} />
                </DeleteButton>
              </li>
            ))}
          </List>
          {entries.length > 5 && (
            <Button $variant="ghost" $size="sm" onClick={() => setShowAll((v) => !v)}>
              {showAll ? "Show less" : `Show all ${entries.length}`}
            </Button>
          )}
        </>
      )}
    </Card>
  );
};

const Form = styled.form`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
  gap: 10px;
  align-items: end;

  @media (max-width: 480px) {
    grid-template-columns: 1fr 1fr;

    button {
      grid-column: 1 / -1;
    }
  }
`;

const List = styled.ul`
  list-style: none;
  padding: 0;
  margin: 4px 0 12px;

  li {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 12px;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid var(--border);
  }

  span {
    color: var(--muted);
  }
`;

const DeleteButton = styled.button`
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: none;
  color: var(--muted);

  &:hover {
    background: var(--danger-soft);
    color: var(--danger);
  }
`;
