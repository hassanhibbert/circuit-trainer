import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import { api, errorMessage } from "./api";
import { ACCENT, Input, Muted, PrimaryButton, QuietButton, TextArea, MUTED } from "./ui";

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
      <Wrapper>
        <Muted>
          {queued
            ? "Couldn't reach the server, so this workout was saved on this device. It will sync next time the app opens."
            : "This workout couldn't be saved."}
        </Muted>
        <PrimaryButton onClick={onDone}>Return to Workouts</PrimaryButton>
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      {!expanded ? (
        <QuietButton onClick={() => setExpanded(true)}>Log reps &amp; weights</QuietButton>
      ) : (
        <>
          <Muted>Adjust what you actually did. Empty rows are skipped.</Muted>
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
      <TextArea
        placeholder="Notes (optional): how did it feel?"
        value={notes}
        maxLength={2000}
        onChange={(e) => setNotes(e.target.value)}
      />
      <Buttons>
        <QuietButton onClick={onDone} disabled={saving}>
          Skip
        </QuietButton>
        <PrimaryButton onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </PrimaryButton>
      </Buttons>
    </Wrapper>
  );
};

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
  text-align: left;
  font-family: "Source Sans 3", sans-serif;
`;

const SetTable = styled.div`
  display: grid;
  grid-template-columns: 1fr 64px 72px 64px;
  gap: 6px 8px;
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
  padding: 6px;
  width: 100%;
  box-sizing: border-box;
`;

const Buttons = styled.div`
  display: flex;
  justify-content: space-between;
`;
