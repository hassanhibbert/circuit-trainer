import { useEffect, useState } from "react";
import { useInterval } from "./useInterval";
import { useCue } from "./useCue";
import { getFormattedCountdown, getCueDuration } from "./utils";
import styled from "styled-components";

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
    <>
      <WorkoutHeading>{title}</WorkoutHeading>
      {modifier && <Blurb>{modifier}</Blurb>}
      <Container>
        <CountDown>{getFormattedCountdown(duration.minutes, duration.seconds)}</CountDown>
        <ButtonAction>
          <button onClick={handlePauseResume}>
            {paused ? "Resume" : "Pause"}
          </button>
          <button onClick={handleSkip}>Skip</button>
        </ButtonAction>
      </Container>
    </>
  );
};
const ButtonAction = styled.div`
  display: flex;
  justify-content: space-between;
  :first-child {
    flex-grow: 1;
  }
  :last-child {
    margin-left: 10px;
  }
`;
const WorkoutHeading = styled.h2`
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
