export const stepsOf = (program) =>
  program.type === "manual" ? program.exercises : program.sections.flatMap((s) => s.units);

export const lengthLabel = (program) => {
  const steps = stepsOf(program);
  if (program.type === "manual") return `${steps.length} sets`;
  const seconds = steps.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0);
  return `${Math.round(seconds / 60)} min`;
};
