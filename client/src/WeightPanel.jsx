import { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import { api, errorMessage } from "./api";
import { WeightChart } from "./WeightChart";
import { Card, CardTitle, DangerButton, Input, Label, Muted, PrimaryButton, Row, formatLb, localToday, MUTED } from "./ui";

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
      // Logging the same day twice updates that day's entry instead of failing.
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
      <form onSubmit={handleSubmit}>
        <Row>
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
              style={{ width: "7em" }}
            />
          </Label>
          <PrimaryButton type="submit" disabled={saving}>
            Log
          </PrimaryButton>
        </Row>
      </form>
      {entries.length === 0 ? (
        <Muted>No weigh-ins yet. Log one to start your trend.</Muted>
      ) : (
        <>
          <WeightChart entries={entries} />
          <List>
            {entries.slice(0, 10).map((entry) => (
              <li key={entry.id}>
                <span>{new Date(`${entry.measuredOn}T00:00:00`).toLocaleDateString()}</span>
                <strong>{formatLb(entry.weightLb)}</strong>
                <DangerButton onClick={() => handleDelete(entry.id)} aria-label={`Delete ${entry.measuredOn}`}>
                  ×
                </DangerButton>
              </li>
            ))}
          </List>
          {entries.length > 10 && <Muted>Showing the 10 most recent of {entries.length} in the last 6 months.</Muted>}
        </>
      )}
    </Card>
  );
};

const List = styled.ul`
  list-style: none;
  padding: 0;
  margin: 8px 0 0;

  li {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 12px;
    align-items: center;
    padding: 4px 0;
    border-bottom: 1px solid #4d4d4d;
  }

  span {
    color: ${MUTED};
  }
`;
