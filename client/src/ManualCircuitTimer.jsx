import { useState } from "react";
import styled from "styled-components";
import { Button } from "./ui";
import { CountDown, ExerciseName, Modifier } from "./CircuitTimer";
import { getFormattedCountdown, getCueDuration } from "./utils";
import { useInterval } from "./useInterval";
import { useCue } from "./useCue";

export const ManualCircuitTimer = ({
  phase,
  title,
  setLabel,
  reps,
  modifier,
  restTargetSeconds,
  breakElapsedSeconds,
  isLastExercise,
  holdMinutes,
  holdSeconds,
  onFinishExercise,
  onNextWorkout,
}) => {
  const { play } = useCue();
  const hasHoldTimer = holdMinutes != null && holdSeconds != null;
  const [remaining, setRemaining] = useState(
    hasHoldTimer ? holdMinutes * 60 + holdSeconds : 0
  );
  const [holdFinished, setHoldFinished] = useState(false);

  useInterval(() => {
    if (!hasHoldTimer || phase !== "exercise" || holdFinished) return;

    const cueDuration = getCueDuration(remaining);
    if (cueDuration) play(cueDuration);

    if (remaining === 0) {
      setHoldFinished(true);
      return;
    }
    setRemaining((prev) => prev - 1);
  }, 1000);

  if (phase === "break") {
    const minutes = Math.floor(breakElapsedSeconds / 60);
    const seconds = breakElapsedSeconds % 60;
    const restDone = restTargetSeconds && breakElapsedSeconds >= restTargetSeconds;

    return (
      <Wrapper>
        <Kicker>Rest</Kicker>
        <CountDown style={restDone ? { color: "var(--accent)" } : undefined}>
          {getFormattedCountdown(minutes, seconds)}
        </CountDown>
        {restTargetSeconds && (
          <Modifier>
            Target {getFormattedCountdown(Math.floor(restTargetSeconds / 60), restTargetSeconds % 60)}
          </Modifier>
        )}
        <Action>
          <Button $variant="primary" $size="lg" $block onClick={onNextWorkout}>
            Next exercise
          </Button>
        </Action>
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      {setLabel && <Kicker>{setLabel}</Kicker>}
      <ExerciseName>{title}</ExerciseName>
      {reps && <Reps>{reps}</Reps>}
      {modifier && <Modifier>{modifier}</Modifier>}
      {hasHoldTimer && <CountDown>{getFormattedCountdown(Math.floor(remaining / 60), remaining % 60)}</CountDown>}
      <Action>
        <Button $variant="primary" $size="lg" $block onClick={onFinishExercise}>
          {isLastExercise ? "Finish workout" : "Done, start rest"}
        </Button>
      </Action>
    </Wrapper>
  );
};

const Wrapper = styled.div`
  text-align: center;
`;

const Kicker = styled.p`
  display: inline-block;
  padding: 4px 12px;
  margin-bottom: 12px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 700;
  font-size: 0.9rem;
`;

const Reps = styled.p`
  font-family: "Oswald", sans-serif;
  font-size: 2.6rem;
  font-weight: 600;
  margin-top: 12px;
`;

const Action = styled.div`
  margin-top: 28px;
`;
