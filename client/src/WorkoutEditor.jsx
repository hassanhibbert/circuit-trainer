import { useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import { errorMessage } from "./api";
import { Button, Card, CardTitle, Input, Label, Muted, PageTitle, TextArea } from "./ui";
import { BackIcon, PlusIcon } from "./icons";

const blankExercise = () => ({
  title: "",
  modifier: "",
  setLabel: "",
  reps: "",
  targetReps: "",
  durationSeconds: "",
  restSeconds: "",
});

const blankSection = () => ({ titleText: "", exercises: [blankExercise()] });

const toText = (value) => (value == null ? "" : String(value));

const fromWorkout = (raw) =>
  raw
    ? {
        title: raw.title,
        description: raw.description ?? "",
        mode: raw.mode,
        isProgram: raw.programWeeks != null,
        sessionsPerWeek: toText(raw.sessionsPerWeek ?? 3),
        programWeeks: toText(raw.programWeeks ?? 4),
        sections: raw.sections.map((s) => ({
          titleText: s.titleLines.join("\n"),
          exercises: s.exercises.map((e) => ({
            title: e.title,
            modifier: toText(e.modifier),
            setLabel: toText(e.setLabel),
            reps: toText(e.reps),
            targetReps: toText(e.targetReps),
            durationSeconds: toText(e.durationSeconds),
            restSeconds: toText(e.restSeconds),
          })),
        })),
      }
    : {
        title: "",
        description: "",
        mode: "MANUAL",
        isProgram: false,
        sessionsPerWeek: "3",
        programWeeks: "4",
        sections: [blankSection()],
      };

const textOrNull = (value) => (value.trim() === "" ? null : value.trim());
const numberOrNull = (value) => (String(value).trim() === "" ? null : Number(value));

const toRequest = (form) => ({
  title: form.title.trim(),
  description: textOrNull(form.description),
  mode: form.mode,
  sessionsPerWeek: form.isProgram ? numberOrNull(form.sessionsPerWeek) : null,
  programWeeks: form.isProgram ? numberOrNull(form.programWeeks) : null,
  sections: form.sections.map((s) => ({
    titleLines: s.titleText.split("\n").map((l) => l.trim()).filter(Boolean),
    exercises: s.exercises.map((e) => ({
      title: e.title.trim(),
      modifier: textOrNull(e.modifier),
      setLabel: textOrNull(e.setLabel),
      reps: textOrNull(e.reps),
      targetReps: numberOrNull(e.targetReps),
      durationSeconds: numberOrNull(e.durationSeconds),
      restSeconds: numberOrNull(e.restSeconds),
    })),
  })),
});

export const WorkoutEditor = ({ program, onSave, onCancel }) => {
  const [form, setForm] = useState(() => fromWorkout(program?.raw));
  const [saving, setSaving] = useState(false);
  const timed = form.mode === "TIMED";

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const updateSection = (si, update) =>
    setForm((f) => ({ ...f, sections: f.sections.map((s, i) => (i === si ? update(s) : s)) }));

  const updateExercises = (si, update) => updateSection(si, (s) => ({ ...s, exercises: update(s.exercises) }));

  const moveExercise = (si, ei, delta) =>
    updateExercises(si, (list) => {
      const next = [...list];
      [next[ei], next[ei + delta]] = [next[ei + delta], next[ei]];
      return next;
    });

  const updateExercise = (si, ei, field, value) =>
    updateSection(si, (s) => ({
      ...s,
      exercises: s.exercises.map((e, i) => (i === ei ? { ...e, [field]: value } : e)),
    }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave(program?.id ?? null, toRequest(form));
      toast.success("Workout saved.");
    } catch (err) {
      toast.error(errorMessage(err));
      setSaving(false);
    }
  };

  const field = (si, ei, name, label, props = {}) => (
    <Label>
      {label}
      <Input
        value={form.sections[si].exercises[ei][name]}
        onChange={(e) => updateExercise(si, ei, name, e.target.value)}
        {...props}
      />
    </Label>
  );

  return (
    <form onSubmit={handleSubmit}>
      <TopBar>
        <Button type="button" $variant="ghost" $size="sm" onClick={onCancel}>
          <BackIcon size={16} /> Cancel
        </Button>
      </TopBar>
      <PageTitle>{program ? "Edit workout" : "New workout"}</PageTitle>

      <Card>
        <Fields>
          <Label className="wide">
            Name
            <Input value={form.title} maxLength={120} onChange={(e) => set("title", e.target.value)} required />
          </Label>
          <Label className="wide">
            Description
            <TextArea
              value={form.description}
              maxLength={4000}
              placeholder="Optional. Basic formatting like <strong> and lists works."
              onChange={(e) => set("description", e.target.value)}
            />
          </Label>
          <div className="wide">
            <FieldLabel>Type</FieldLabel>
            <Segmented role="radiogroup">
              {[
                ["MANUAL", "Self-paced", "Tap through sets, rest timer between"],
                ["TIMED", "Timed", "Countdowns that move on by themselves"],
              ].map(([value, name, hint]) => (
                <SegmentButton
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={form.mode === value}
                  $active={form.mode === value}
                  onClick={() => set("mode", value)}
                >
                  <strong>{name}</strong>
                  <span>{hint}</span>
                </SegmentButton>
              ))}
            </Segmented>
          </div>
          <Checkbox className="wide">
            <input type="checkbox" checked={form.isProgram} onChange={(e) => set("isProgram", e.target.checked)} />
            Multi-week program (shows &ldquo;Week 2 of 4&rdquo;)
          </Checkbox>
          {form.isProgram && (
            <>
              <Label>
                Sessions per week
                <Input type="number" min="1" max="14" value={form.sessionsPerWeek} onChange={(e) => set("sessionsPerWeek", e.target.value)} />
              </Label>
              <Label>
                Weeks
                <Input type="number" min="1" max="52" value={form.programWeeks} onChange={(e) => set("programWeeks", e.target.value)} />
              </Label>
            </>
          )}
        </Fields>
      </Card>

      {form.sections.map((section, si) => (
        <Card key={si}>
          <SectionHeader>
            <CardTitle>Section {si + 1}</CardTitle>
            {form.sections.length > 1 && (
              <TextButton
                type="button"
                $danger
                onClick={() => setForm((f) => ({ ...f, sections: f.sections.filter((_, i) => i !== si) }))}
              >
                Remove section
              </TextButton>
            )}
          </SectionHeader>
          <Label>
            Title (optional, one line per row)
            <TextArea
              rows={2}
              value={section.titleText}
              placeholder={"Round 1\nLower body"}
              onChange={(e) => updateSection(si, (s) => ({ ...s, titleText: e.target.value }))}
              style={{ minHeight: 0 }}
            />
          </Label>

          {section.exercises.map((exercise, ei) => (
            <Exercise key={ei}>
              <ExerciseHeader>
                <StepNumber>{ei + 1}</StepNumber>
                <Input
                  aria-label="Exercise name"
                  placeholder="Exercise name"
                  value={exercise.title}
                  maxLength={120}
                  onChange={(e) => updateExercise(si, ei, "title", e.target.value)}
                  required
                />
              </ExerciseHeader>
              <Fields>
                {timed ? (
                  <>
                    {field(si, ei, "durationSeconds", "Seconds", { type: "number", min: 1, max: 3600, required: true })}
                    {field(si, ei, "modifier", "Note", { maxLength: 200, placeholder: "e.g. knees down" })}
                  </>
                ) : (
                  <>
                    {field(si, ei, "setLabel", "Set label", { maxLength: 60, placeholder: "Set 1 of 3" })}
                    {field(si, ei, "reps", "Reps", { maxLength: 60, placeholder: "8-10 reps" })}
                    {field(si, ei, "targetReps", "Target reps", { type: "number", min: 1, max: 1000, inputMode: "numeric" })}
                    {field(si, ei, "restSeconds", "Rest (sec)", { type: "number", min: 0, max: 3600, inputMode: "numeric" })}
                    {field(si, ei, "durationSeconds", "Hold (sec)", { type: "number", min: 1, max: 3600, inputMode: "numeric" })}
                    {field(si, ei, "modifier", "Note", { maxLength: 200, placeholder: "e.g. light, focus on form" })}
                  </>
                )}
              </Fields>
              <ExerciseActions>
                <TextButton type="button" disabled={ei === 0} onClick={() => moveExercise(si, ei, -1)}>
                  Move up
                </TextButton>
                <TextButton type="button" disabled={ei === section.exercises.length - 1} onClick={() => moveExercise(si, ei, 1)}>
                  Move down
                </TextButton>
                <TextButton
                  type="button"
                  onClick={() => updateExercises(si, (list) => [...list.slice(0, ei + 1), { ...exercise }, ...list.slice(ei + 1)])}
                >
                  Duplicate
                </TextButton>
                {section.exercises.length > 1 && (
                  <TextButton type="button" $danger onClick={() => updateExercises(si, (list) => list.filter((_, i) => i !== ei))}>
                    Remove
                  </TextButton>
                )}
              </ExerciseActions>
            </Exercise>
          ))}
          <AddButton type="button" onClick={() => updateExercises(si, (list) => [...list, blankExercise()])}>
            <PlusIcon size={16} /> Add exercise
          </AddButton>
        </Card>
      ))}

      <AddButton type="button" style={{ marginTop: 16 }} onClick={() => setForm((f) => ({ ...f, sections: [...f.sections, blankSection()] }))}>
        <PlusIcon size={16} /> Add section
      </AddButton>
      {timed && <Muted style={{ marginTop: 12 }}>Tip: add steps called &ldquo;Rest&rdquo; for timed rest periods.</Muted>}

      <Footer>
        <Button type="button" $variant="ghost" $size="lg" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" $variant="primary" $size="lg" disabled={saving} style={{ flex: 1 }}>
          {saving ? "Saving…" : "Save workout"}
        </Button>
      </Footer>
    </form>
  );
};

const TopBar = styled.div`
  padding-top: 8px;
`;

const Fields = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  .wide {
    grid-column: 1 / -1;
  }
`;

const FieldLabel = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--muted);
  margin-bottom: 6px;
`;

const Segmented = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`;

const SegmentButton = styled.button`
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: left;
  padding: 12px;
  border-radius: var(--radius-sm);
  border: 1px solid ${(p) => (p.$active ? "var(--accent)" : "var(--border)")};
  background: ${(p) => (p.$active ? "var(--accent-soft)" : "var(--surface-2)")};

  strong {
    color: ${(p) => (p.$active ? "var(--accent)" : "var(--text)")};
  }

  span {
    font-size: 0.8rem;
    color: var(--muted);
  }
`;

const Checkbox = styled.label`
  display: flex;
  gap: 10px;
  align-items: center;
  color: var(--text);

  input {
    width: 18px;
    height: 18px;
    accent-color: var(--accent);
  }
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
`;

const Exercise = styled.div`
  margin-top: 14px;
  padding: 14px;
  border-radius: var(--radius-sm);
  background: var(--bg);
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ExerciseHeader = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
`;

const StepNumber = styled.span`
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 700;
  font-size: 0.85rem;
`;

const ExerciseActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: -4px -8px 0;
`;

const TextButton = styled.button`
  background: none;
  border: none;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 700;
  color: ${(p) => (p.$danger ? "var(--danger)" : "var(--muted)")};

  &:hover:not(:disabled) {
    background: var(--surface-2);
  }

  &:disabled {
    opacity: 0.35;
    cursor: default;
  }
`;

const AddButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  margin-top: 14px;
  padding: 12px;
  border-radius: var(--radius-sm);
  border: 1px dashed var(--border);
  background: none;
  color: var(--muted);
  font-weight: 700;

  &:hover {
    border-color: var(--accent);
    color: var(--accent);
  }
`;

const Footer = styled.div`
  position: sticky;
  bottom: calc(var(--nav-height) + env(safe-area-inset-bottom));
  display: flex;
  gap: 10px;
  margin-top: 16px;
  padding: 16px 0;
  background: linear-gradient(to bottom, transparent, var(--bg) 30%);

  @media (min-width: 768px) {
    bottom: 0;
  }
`;
