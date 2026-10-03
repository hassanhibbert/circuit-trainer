import { useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import { errorMessage } from "./api";
import {
  Card,
  CardTitle,
  DangerButton,
  Input,
  Label,
  Muted,
  PrimaryButton,
  QuietButton,
  Row,
  Select,
  TextArea,
  MUTED,
} from "./ui";

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

// Form state uses strings throughout (what inputs hold); toRequest converts back.
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

  return (
    <Card as="form" onSubmit={handleSubmit}>
      <CardTitle>{program ? "Edit workout" : "New workout"}</CardTitle>
      <Stack>
        <Label>
          Title
          <Input value={form.title} maxLength={120} onChange={(e) => set("title", e.target.value)} required />
        </Label>
        <Label>
          Description (basic HTML allowed: p, strong, em, lists)
          <TextArea value={form.description} maxLength={4000} onChange={(e) => set("description", e.target.value)} />
        </Label>
        <Row>
          <Label>
            Mode
            <Select value={form.mode} onChange={(e) => set("mode", e.target.value)}>
              <option value="MANUAL">Manual: tap through sets at your own pace</option>
              <option value="TIMED">Timed: auto-advancing countdowns</option>
            </Select>
          </Label>
        </Row>
        <Checkbox>
          <input type="checkbox" checked={form.isProgram} onChange={(e) => set("isProgram", e.target.checked)} />
          Multi-week program (shows &ldquo;Week X of N&rdquo;)
        </Checkbox>
        {form.isProgram && (
          <Row>
            <Label>
              Sessions / week
              <Input type="number" min="1" max="14" value={form.sessionsPerWeek} onChange={(e) => set("sessionsPerWeek", e.target.value)} style={{ width: "6em" }} />
            </Label>
            <Label>
              Weeks
              <Input type="number" min="1" max="52" value={form.programWeeks} onChange={(e) => set("programWeeks", e.target.value)} style={{ width: "6em" }} />
            </Label>
          </Row>
        )}

        {form.sections.map((section, si) => (
          <Section key={si}>
            <SectionHeader>
              <Label style={{ flex: 1 }}>
                Section {si + 1} title (optional, one line per row)
                <TextArea
                  rows={2}
                  value={section.titleText}
                  onChange={(e) => updateSection(si, (s) => ({ ...s, titleText: e.target.value }))}
                  style={{ minHeight: 0 }}
                />
              </Label>
              {form.sections.length > 1 && (
                <DangerButton type="button" onClick={() => setForm((f) => ({ ...f, sections: f.sections.filter((_, i) => i !== si) }))}>
                  Remove section
                </DangerButton>
              )}
            </SectionHeader>

            {section.exercises.map((exercise, ei) => (
              <Exercise key={ei}>
                <Row>
                  <Label style={{ flex: 2, minWidth: 160 }}>
                    Exercise
                    <Input value={exercise.title} maxLength={120} onChange={(e) => updateExercise(si, ei, "title", e.target.value)} required />
                  </Label>
                  {timed ? (
                    <Label>
                      Seconds
                      <Input type="number" min="1" max="3600" value={exercise.durationSeconds} onChange={(e) => updateExercise(si, ei, "durationSeconds", e.target.value)} required style={{ width: "5em" }} />
                    </Label>
                  ) : (
                    <>
                      <Label>
                        Set label
                        <Input value={exercise.setLabel} maxLength={60} placeholder="Set 1 of 3" onChange={(e) => updateExercise(si, ei, "setLabel", e.target.value)} style={{ width: "8em" }} />
                      </Label>
                      <Label>
                        Reps (text)
                        <Input value={exercise.reps} maxLength={60} placeholder="8-10 reps" onChange={(e) => updateExercise(si, ei, "reps", e.target.value)} style={{ width: "7em" }} />
                      </Label>
                      <Label>
                        Target reps
                        <Input type="number" min="1" max="1000" value={exercise.targetReps} onChange={(e) => updateExercise(si, ei, "targetReps", e.target.value)} style={{ width: "5em" }} />
                      </Label>
                      <Label>
                        Rest (s)
                        <Input type="number" min="0" max="3600" value={exercise.restSeconds} onChange={(e) => updateExercise(si, ei, "restSeconds", e.target.value)} style={{ width: "5em" }} />
                      </Label>
                      <Label>
                        Hold (s)
                        <Input type="number" min="1" max="3600" value={exercise.durationSeconds} onChange={(e) => updateExercise(si, ei, "durationSeconds", e.target.value)} style={{ width: "5em" }} />
                      </Label>
                    </>
                  )}
                </Row>
                <Row>
                  <Label style={{ flex: 1 }}>
                    Note (optional)
                    <Input value={exercise.modifier} maxLength={200} placeholder="e.g. knees down if needed" onChange={(e) => updateExercise(si, ei, "modifier", e.target.value)} />
                  </Label>
                  <QuietButton
                    type="button"
                    onClick={() => updateSection(si, (s) => ({ ...s, exercises: [...s.exercises.slice(0, ei + 1), { ...exercise }, ...s.exercises.slice(ei + 1)] }))}
                  >
                    Duplicate
                  </QuietButton>
                  {section.exercises.length > 1 && (
                    <DangerButton type="button" onClick={() => updateSection(si, (s) => ({ ...s, exercises: s.exercises.filter((_, i) => i !== ei) }))}>
                      Remove
                    </DangerButton>
                  )}
                </Row>
              </Exercise>
            ))}
            <QuietButton type="button" onClick={() => updateSection(si, (s) => ({ ...s, exercises: [...s.exercises, blankExercise()] }))}>
              + Exercise
            </QuietButton>
          </Section>
        ))}
        <QuietButton type="button" onClick={() => setForm((f) => ({ ...f, sections: [...f.sections, blankSection()] }))}>
          + Section
        </QuietButton>
        {timed && <Muted>Tip: add steps titled &ldquo;Rest&rdquo; for timed rest periods.</Muted>}
        <Buttons>
          <QuietButton type="button" onClick={onCancel} disabled={saving}>
            Cancel
          </QuietButton>
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save workout"}
          </PrimaryButton>
        </Buttons>
      </Stack>
    </Card>
  );
};

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: stretch;
`;

const Checkbox = styled.label`
  display: flex;
  gap: 8px;
  align-items: center;
  color: ${MUTED};
`;

const Section = styled.div`
  border: 1px solid #5f5e5a;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-start;

  > * {
    align-self: stretch;
  }
  > button {
    align-self: flex-start;
  }
`;

const SectionHeader = styled.div`
  display: flex;
  gap: 10px;
  align-items: flex-end;
`;

const Exercise = styled.div`
  background: #383838;
  border-radius: 6px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Buttons = styled.div`
  display: flex;
  justify-content: space-between;
`;
