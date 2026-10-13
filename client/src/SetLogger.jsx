import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import { api, errorMessage } from "./api";
import { ACCENT, Button, Card, CardTitle, Input, Label, Muted, TextArea, MUTED } from "./ui";

const isRestStep = (step) => /^(rest|get ready)\b/i.test(step.title?.trim() ?? "");

const stepKey = (title, setLabel) => `${title}|${setLabel ?? ""}`;

const toNumberOrNull = (value) => (value === "" || value == null ? null : Number(value));

export const SetLogger = ({ program, session, queued, onDone }) => {
  const steps = useMemo(() => {
    const all = program.type === "manual" ? program.exercises : program.sections.flatMap((s) => s.units);
    return all.filter((step) => !isRestStep(step));
  }, [program]);

  const [rows, setRows] = useState(() =>
    steps.map((step) => ({
      exerciseTitle: step.title,
      setLabel: step.setLabel ?? null,
      reps: step.targetReps ?? "",
      weightLb: "",
      durationSeconds: step.durationSeconds ?? "",
    }))
  );
  const [notes, setNotes] = useState("");
  const [expanded, setExpanded] = useState(program.type === "manual");
  const [saving, setSaving] = useState(false);

  // prefill weights from the last session
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    api
      .get(`/api/v1/sessions?workoutId=${program.id}&size=5`)
      .then((page) => {
        const previous = page.content.find((s) => s.id !== session.id && s.sets.length > 0);
        if (!previous || cancelled) return;
        const lastWeights = new Map(
          previous.sets.filter((s) => s.weightLb != null).map((s) => [stepKey(s.exerciseTitle, s.setLabel), s.weightLb])
        );
        setRows((current) =>
          current.map((row) =>
            row.weightLb === "" && lastWeights.has(stepKey(row.exerciseTitle, row.setLabel))
              ? { ...row, weightLb: lastWeights.get(stepKey(row.exerciseTitle, row.setLabel)) }
              : row
          )
        );
      })
      .catch(() => {
        // prefill is optional
      });
    return () => {
      cancelled = true;
    };
  }, [program.id, session]);

  const updateRow = (index, field, value) => {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const handleSave = async () => {
    const sets = rows
      .map((row) => ({
        exerciseTitle: row.exerciseTitle,
        setLabel: row.setLabel,
        reps: toNumberOrNull(row.reps),
        weightLb: toNumberOrNull(row.weightLb),
        durationSeconds: toNumberOrNull(row.durationSeconds),
      }))
      .filter((s) => s.reps != null || s.weightLb != null || s.durationSeconds != null);

    setSaving(true);
    try {
      await api.put(`/api/v1/sessions/${session.id}`, {
        workoutId: session.workoutId,
        workoutTitle: session.workoutTitle,
        completedAt: session.completedAt,
        totalSeconds: session.totalSeconds,
        notes,
        sets: expanded ? sets : [],
      });
      toast.success("Workout saved.");
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
      setSaving(false);
    }
  };

  if (!session) {
    return (
      <Card>
        <Muted>
          {queued
            ? "Couldn't reach the server, so this workout was saved on this device. It will sync next time the app opens."
            : "This workout couldn't be saved."}
        </Muted>
        <Footer>
          <Button $variant="primary" $size="lg" $block onClick={onDone}>
            Back to workouts
          </Button>
        </Footer>
      </Card>
    );
  }

  return (
    <>
      <Card>
        {!expanded ? (
          <Button $block onClick={() => setExpanded(true)}>
            Log reps &amp; weights
          </Button>
        ) : (
          <>
            <CardTitle>What you did</CardTitle>
            <Muted style={{ marginBottom: 12 }}>Change anything that was different. Empty rows are skipped.</Muted>
            <SetTable>
              <HeaderCell>Exercise</HeaderCell>
              <HeaderCell>Reps</HeaderCell>
              <HeaderCell>lb</HeaderCell>
              <HeaderCell>Sec</HeaderCell>
              {rows.map((row, index) => (
                <SetRow key={index}>
                  <ExerciseCell>
                    {row.exerciseTitle}
                    {row.setLabel && <SetLabel>{row.setLabel}</SetLabel>}
                  </ExerciseCell>
                  <SmallInput
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max="1000"
                    aria-label={`${row.exerciseTitle} reps`}
                    value={row.reps}
                    onChange={(e) => updateRow(index, "reps", e.target.value)}
                  />
                  <SmallInput
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max="2000"
                    step="0.5"
                    aria-label={`${row.exerciseTitle} weight in pounds`}
                    value={row.weightLb}
                    onChange={(e) => updateRow(index, "weightLb", e.target.value)}
                  />
                  <SmallInput
                    type="number"
                    inputMode="numeric"
                    min="0"
                    aria-label={`${row.exerciseTitle} seconds`}
                    value={row.durationSeconds}
                    onChange={(e) => updateRow(index, "durationSeconds", e.target.value)}
                  />
                </SetRow>
              ))}
            </SetTable>
          </>
        )}
      </Card>
      <Card>
        <Label>
          Notes
          <TextArea
            placeholder="How did it feel?"
            value={notes}
            maxLength={2000}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Label>
      </Card>
      <Footer>
        <Button $variant="ghost" $size="lg" onClick={onDone} disabled={saving}>
          Skip
        </Button>
        <Button $variant="primary" $size="lg" onClick={handleSave} disabled={saving} style={{ flex: 1 }}>
          {saving ? "Saving…" : "Save workout"}
        </Button>
      </Footer>
    </>
  );
};

const Footer = styled.div`
  position: sticky;
  bottom: 0;
  display: flex;
  gap: 10px;
  margin-top: 16px;
  padding: 16px 0 calc(16px + env(safe-area-inset-bottom));
  background: linear-gradient(to bottom, transparent, var(--bg) 30%);
`;

const SetTable = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 52px 60px 52px;
  gap: 6px;
  align-items: center;
`;

const SetRow = styled.div`
  display: contents;
`;

const HeaderCell = styled.div`
  color: ${MUTED};
  font-size: 0.8rem;
`;

const ExerciseCell = styled.div`
  font-size: 0.95rem;
  line-height: 1.2;
`;

const SetLabel = styled.div`
  color: ${ACCENT};
  font-size: 0.8rem;
`;

const SmallInput = styled(Input)`
  padding: 6px 4px;
  width: 100%;
  box-sizing: border-box;
  text-align: center;
  -moz-appearance: textfield;

  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
`;

