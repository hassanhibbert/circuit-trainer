import { useState } from "react";
import styled from "styled-components";
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

    return (
      <>
        <WorkoutHeading>Break</WorkoutHeading>
        {restTargetSeconds && (
          <RestTarget>
            Target:{" "}
            {getFormattedCountdown(
              Math.floor(restTargetSeconds / 60),
              restTargetSeconds % 60
            )}
          </RestTarget>
        )}
        <Container>
          <CountDown>{getFormattedCountdown(minutes, seconds)}</CountDown>
          <ButtonAction>
            <button onClick={onNextWorkout}>Next Workout</button>
          </ButtonAction>
        </Container>
      </>
    );
  }

  return (
    <>
      <WorkoutHeading>{title}</WorkoutHeading>
      {setLabel && <SetLabel>{setLabel}</SetLabel>}
      {reps && <RepsText>{reps}</RepsText>}
      {modifier && <Blurb>{modifier}</Blurb>}
      {hasHoldTimer && (
        <Container>
          <CountDown>
            {getFormattedCountdown(
              Math.floor(remaining / 60),
              remaining % 60
            )}
          </CountDown>
        </Container>
      )}
      <Container>
        <ButtonAction>
          <button onClick={onFinishExercise}>
            {isLastExercise ? "Finish Workout" : "Start Break"}
          </button>
        </ButtonAction>
      </Container>
    </>
  );
};

const ButtonAction = styled.div`
  display: flex;
  justify-content: space-around;
  margin-top: 15px;
`;

const WorkoutHeading = styled.h2`
  text-align: center;
`;

const SetLabel = styled.p`
  color: #00b7ac;
  margin: 0;
  font-weight: 700;
  text-align: center;
`;

const RepsText = styled.p`
  color: #e2e2e2;
  margin: 4px 0 0;
  font-family: "Source Sans 3", sans-serif;
  font-size: 1.3rem;
  text-align: center;
`;

const RestTarget = styled.p`
  color: #e2e2e2;
  margin: 0;
  font-family: "Source Sans 3", sans-serif;
  text-align: center;
`;

const Blurb = styled.p`
  color: #e2e2e2;
  margin-bottom: 0;
  font-family: "Source Sans 3", sans-serif;
  text-align: center;
`;

const Container = styled.div`
  text-align: center;
`;

const CountDown = styled.h3`
  font-size: 5em;
  padding: 0;
  margin: 0;
`;
