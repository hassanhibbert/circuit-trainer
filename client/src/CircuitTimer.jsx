import { useEffect, useState } from "react";
import { useInterval } from "./useInterval";
import { useCue } from "./useCue";
import { getFormattedCountdown, getCueDuration } from "./utils";
import styled from "styled-components";
import { Button } from "./ui";
import { PauseIcon, PlayIcon, SkipIcon } from "./icons";

export const CircutTimer = ({
  minutes = null,
  seconds = null,
  onComplete,
  modifier,
  title,
}) => {
  const [duration, setDuration] = useState({ minutes, seconds });
  const [completed, setCompleted] = useState(false);
  const [paused, setPaused] = useState(false);
  const { play } = useCue();

  const handleSkip = () => {
    setDuration({ minutes: 0, seconds: 0 });
    setCompleted(true);
  };

  useEffect(() => {
    if (completed) {
      onComplete?.();
    }
  }, [completed, onComplete]);

  useInterval(() => {
    if (paused || completed) return;

    const totalRemaining = duration.minutes * 60 + duration.seconds;
    const cueDuration = getCueDuration(totalRemaining);
    if (cueDuration) play(cueDuration);

    if (totalRemaining === 0) {
      setCompleted(true);
      return;
    }

    if (duration.seconds === 0) {
      setDuration((prevState) => ({
        minutes: prevState.minutes - 1,
        seconds: 59,
      }));
    } else {
      setDuration((prevState) => ({
        ...prevState,
        seconds: prevState.seconds - 1,
      }));
    }
  }, 1000);

  const handlePauseResume = () => {
    setPaused((state) => !state);
  };

  return (
    <Wrapper>
      <ExerciseName>{title}</ExerciseName>
      {modifier && <Modifier>{modifier}</Modifier>}
      <CountDown $paused={paused}>{getFormattedCountdown(duration.minutes, duration.seconds)}</CountDown>
      <Controls>
        <Button $size="lg" onClick={handlePauseResume}>
          {paused ? <PlayIcon size={18} /> : <PauseIcon size={18} />}
          {paused ? "Resume" : "Pause"}
        </Button>
        <Button $size="lg" $variant="ghost" onClick={handleSkip}>
          <SkipIcon size={18} /> Skip
        </Button>
      </Controls>
    </Wrapper>
  );
};

const Wrapper = styled.div`
  text-align: center;
`;

export const ExerciseName = styled.h2`
  font-size: 1.9rem;
  font-weight: 800;
  line-height: 1.15;
`;

export const Modifier = styled.p`
  color: var(--muted);
  margin-top: 6px;
`;

export const CountDown = styled.div`
  font-family: "Oswald", sans-serif;
  font-size: clamp(5rem, 28vw, 8rem);
  font-weight: 600;
  line-height: 1;
  margin: 28px 0;
  font-variant-numeric: tabular-nums;
  opacity: ${(p) => (p.$paused ? 0.45 : 1)};
`;

const Controls = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`;
