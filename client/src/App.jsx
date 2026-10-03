import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import { CircutTimer } from "./CircuitTimer";
import { ManualCircuitTimer } from "./ManualCircuitTimer";
import { useProgram } from "./useProgram";
import { useStopwatch } from "./useStopwatch";
import { useCue } from "./useCue";
import { useWorkoutHistory } from "./useWorkoutHistory";
import { BackupControls } from "./BackupControls";
import { getFormattedCountdown, getCueDuration } from "./utils";
import trainerIcon from "./assets/trainer_icon.png";
import styled from "styled-components";
import { ToastContainer } from "react-toastify";
import { useWakeLock } from "./useWakeLock";
import stuff from "./workouts";

const SESSION_KEY = "circuit-trainer:session";

function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSession(session) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // storage unavailable -- resume just won't be offered next time
  }
}

function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

function App() {
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [workoutStarted, setWorkoutStarted] = useState(false);
  const [phase, setPhase] = useState("exercise");
  const [pendingResume, setPendingResume] = useState(() => {
    const saved = readSession();
    if (saved && stuff.some((p) => p.title === saved.workoutTitle)) {
      return saved;
    }
    if (saved) clearSession();
    return null;
  });
  const isManual = selectedProgram?.type === "manual";

  const workouts = useMemo(() => {
    if (!selectedProgram) return undefined;
    if (isManual) return selectedProgram.exercises;
    return selectedProgram.sections
      .reduce((acc, section) => {
        return acc.concat(
          section.units.map((unit) => ({ sectionId: section.id, ...unit }))
        );
      }, [])
      .flat();
  }, [selectedProgram, isManual]);

  const sectionMapping = useMemo(() => {
    if (!selectedProgram || isManual) return undefined;
    return selectedProgram.sections.reduce((acc, section) => {
      acc[section.id] = section.title;
      return acc;
    }, {});
  }, [selectedProgram, isManual]);

  const { next, last, program, position, reset, getNextWorkout } = useProgram(
    workouts || [],
    pendingResume?.position ?? 0
  );

  const { request, release } = useWakeLock();
  const { play } = useCue();
  const { recordCompletion, getStatsFor, exportHistory, importHistory, historyCount } =
    useWorkoutHistory();

  const { elapsedSeconds: breakElapsedSeconds, reset: resetBreakStopwatch } =
    useStopwatch(phase === "break");
  const { elapsedSeconds: totalElapsedSeconds, reset: resetTotalStopwatch } =
    useStopwatch(workoutStarted && phase !== "end");

  useEffect(() => {
    if (!selectedProgram || !workoutStarted || phase === "end") return;
    writeSession({ workoutTitle: selectedProgram.title, position, phase });
  }, [selectedProgram, workoutStarted, phase, position]);

  useEffect(() => {
    if (phase !== "break" || !program?.restSeconds) return;
    const remaining = program.restSeconds - breakElapsedSeconds;
    const cueDuration = getCueDuration(remaining);
    if (cueDuration) play(cueDuration);
  }, [phase, breakElapsedSeconds, program?.restSeconds, play]);

  const handleWorkoutComplete = useCallback(() => {
    if (!last) {
      next();
    } else {
      release();
      recordCompletion(selectedProgram.title, totalElapsedSeconds);
      clearSession();
      setPhase("end");
    }
  }, [last, next, release, recordCompletion, selectedProgram, totalElapsedSeconds]);

  const handleStartWorkout = () => {
    request();
    setPhase("exercise");
    setWorkoutStarted(true);
  };

  const handleResetWorkout = useCallback(() => {
    release();
    clearSession();
    setWorkoutStarted(false);
    setPhase("exercise");
    reset();
    resetBreakStopwatch();
    resetTotalStopwatch();
  }, [release, reset, resetBreakStopwatch, resetTotalStopwatch]);

  const handleFinishExercise = useCallback(() => {
    if (last) {
      play();
      release();
      recordCompletion(selectedProgram.title, totalElapsedSeconds);
      clearSession();
      setPhase("end");
    } else {
      resetBreakStopwatch();
      setPhase("break");
    }
  }, [
    last,
    release,
    resetBreakStopwatch,
    play,
    recordCompletion,
    selectedProgram,
    totalElapsedSeconds,
  ]);

  const handleNextWorkout = useCallback(() => {
    next();
    setPhase("exercise");
  }, [next]);

  const handleReturnToList = useCallback(() => {
    release();
    clearSession();
    setWorkoutStarted(false);
    setPhase("exercise");
    setSelectedProgram(null);
    reset();
    resetBreakStopwatch();
    resetTotalStopwatch();
  }, [release, reset, resetBreakStopwatch, resetTotalStopwatch]);

  const handleProgramClick = (program) => {
    setSelectedProgram(program);
  };

  const handleBackButton = () => {
    setSelectedProgram(null);
  };

  const handleResume = useCallback(() => {
    if (!pendingResume) return;
    const found = stuff.find((p) => p.title === pendingResume.workoutTitle);
    if (!found) {
      clearSession();
      setPendingResume(null);
      return;
    }
    setSelectedProgram(found);
    setWorkoutStarted(true);
    setPhase(pendingResume.phase);
    setPendingResume(null);
  }, [pendingResume]);

  const handleDiscardResume = useCallback(() => {
    clearSession();
    setPendingResume(null);
  }, []);

  const showSectionTitle = workoutStarted && !isManual && phase !== "end";

  return (
    <>
      <ToastContainer theme="dark" />
      <Header>
        <CircuitTrainerLogo
          src={trainerIcon}
          className="logo"
          alt="Circuit Trainer Logo"
        />
        <CircuitTrainerText>Circuit Trainer</CircuitTrainerText>
      </Header>
      {!selectedProgram ? (
        <>
          {pendingResume && (
            <ResumeBanner>
              <span>
                Resume <strong>{pendingResume.workoutTitle}</strong>?
              </span>
              <CenterHorizontal>
                <StartWorkoutButton onClick={handleDiscardResume}>
                  Discard
                </StartWorkoutButton>
                <StartWorkoutButton onClick={handleResume}>
                  Resume
                </StartWorkoutButton>
              </CenterHorizontal>
            </ResumeBanner>
          )}
          <WorkoutList>
            {stuff.map((item) => (
              <WorkoutListItem
                onClick={handleProgramClick}
                program={item}
                stats={getStatsFor(item.title, item)}
                key={item.title}
              />
            ))}
          </WorkoutList>
          <BackupControls
            exportHistory={exportHistory}
            importHistory={importHistory}
            historyCount={historyCount}
          />
        </>
      ) : (
        <>
          <WorkoutContainer>
            <CenterHorizontal>
              <WorkoutTitle>
                {showSectionTitle ? (
                  <>
                    {sectionMapping[program.sectionId].map((text) => (
                      <div key={text}>
                        <span>{text}</span>
                        <br />
                      </div>
                    ))}
                  </>
                ) : (
                  selectedProgram.title
                )}
              </WorkoutTitle>
            </CenterHorizontal>

            <Divider />

            {workoutStarted ? (
              phase === "end" ? (
                <CenterHorizontal>
                  <EndSummary>
                    <WorkoutTitle>Workout Complete!</WorkoutTitle>
                    <TotalTimeText>
                      Total Time:{" "}
                      <strong>
                        {getFormattedCountdown(
                          Math.floor(totalElapsedSeconds / 60),
                          totalElapsedSeconds % 60
                        )}
                      </strong>
                    </TotalTimeText>
                    <StartWorkoutButton onClick={handleReturnToList}>
                      Return to Workouts
                    </StartWorkoutButton>
                  </EndSummary>
                </CenterHorizontal>
              ) : isManual ? (
                <ManualCircuitTimer
                  key={position}
                  phase={phase}
                  title={program?.title}
                  setLabel={program?.setLabel}
                  reps={program?.reps}
                  modifier={program?.modifier}
                  restTargetSeconds={program?.restSeconds}
                  breakElapsedSeconds={breakElapsedSeconds}
                  isLastExercise={last}
                  holdMinutes={program?.minutes}
                  holdSeconds={program?.seconds}
                  onFinishExercise={handleFinishExercise}
                  onNextWorkout={handleNextWorkout}
                />
              ) : (
                <CircutTimer
                  key={position}
                  modifier={program?.modifier}
                  title={program?.title}
                  seconds={program?.seconds}
                  minutes={program?.minutes}
                  onComplete={handleWorkoutComplete}
                />
              )
            ) : (
              <>
                <Blurb as="div">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: selectedProgram.description,
                    }}
                  />
                </Blurb>
                <CenterHorizontal>
                  <StartWorkoutButton onClick={handleBackButton}>
                    Back to List
                  </StartWorkoutButton>
                  <StartWorkoutButton onClick={handleStartWorkout}>
                    Start Workout
                  </StartWorkoutButton>
                </CenterHorizontal>
              </>
            )}
          </WorkoutContainer>
          <Container>
            {workoutStarted && !isManual && phase !== "end" && getNextWorkout() && (
              <NextContainer>
                <NextWorkoutText>
                  Next: <strong>{getNextWorkout().title}</strong>
                </NextWorkoutText>
              </NextContainer>
            )}
            <div>&nbsp;</div>
            {workoutStarted && phase !== "end" && (
              <ResetButton onClick={handleResetWorkout}>Reset</ResetButton>
            )}
          </Container>
        </>
      )}
    </>
  );
}

export default App;

const WorkoutList = styled.div`
  margin-top: 30px;
`;
const WorkoutItem = styled.div`
  background: #414141;
  padding: 15px 24px;
  text-align: left;
  border-radius: 6px;
  font-weight: 800;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  button {
    margin-left: 30px;
  }
`;

const ItemSubtitle = styled.div`
  color: #a0a0a0;
  font-weight: 400;
  font-size: 0.85rem;
  margin-top: 4px;
`;

const WorkoutListItem = ({ program, stats, onClick }) => {
  const handleClick = () => {
    onClick(program);
  };

  const subtitle = useMemo(() => {
    if (!stats || stats.timesCompleted === 0) return null;
    const sessionWord = stats.timesCompleted === 1 ? "session" : "sessions";
    if (stats.currentWeek) {
      return `Week ${stats.currentWeek} of ${program.programWeeks} · ${stats.timesCompleted} ${sessionWord}`;
    }
    const lastDate = stats.lastCompletedAt
      ? new Date(stats.lastCompletedAt).toLocaleDateString()
      : null;
    return `${stats.timesCompleted} ${sessionWord}${lastDate ? ` · last ${lastDate}` : ""}`;
  }, [stats, program.programWeeks]);

  return (
    <WorkoutItem>
      <div>
        <span>{program.title}</span>
        {subtitle && <ItemSubtitle>{subtitle}</ItemSubtitle>}
      </div>
      <button onClick={handleClick}> start </button>
    </WorkoutItem>
  );
};

const Container = styled.div`
  // display: flex;
  // flex-direction: column;
  // justify-content: space-between;
`;

const NextContainer = styled.div`
  // margin-bottom: 60px;
`;

export const CenterHorizontal = styled.div`
  display: flex;
  justify-content: space-around;
`;

const Header = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
`;
const CircuitTrainerLogo = styled.img`
  height: 4em;
`;
const CircuitTrainerText = styled.h1`
  font-size: 1.9rem;

  // text-transform: uppercase;
  font-family: "Revalia", sans-serif;
`;

const WorkoutContainer = styled.div`
  background-color: #414141;
  padding: 21px;
  border-radius: 18px;
  margin-top: 30px;
  margin-bottom: 30px;
  text-align: left;
  // min-width: 300px;
`;

const WorkoutTitle = styled.h2`
  color: #00b7ac;
  font-family: "Source Sans 3", sans-serif;
  font-optical-sizing: auto;
  font-style: normal;
  font-weight: 600;
  font-size: 1.6rem;
  text-align: center;
`;

const Blurb = styled.p`
  color: #e2e2e2;
  margin-bottom: 0;
  font-family: "Source Sans 3", sans-serif;
`;

const EndSummary = styled.div`
  width: 100%;
  text-align: center;
`;

const TotalTimeText = styled.p`
  color: #e2e2e2;
  font-size: 1.2rem;
  font-family: "Source Sans 3", sans-serif;
`;

const Divider = styled.hr`
  border: 0;
  height: 0;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
`;

const StartWorkoutButton = styled.button`
  // color: #000;
  margin-top: 15px;
  margin-bottom: 15px;
  // text-transform: uppercase;
`;

const ResetButton = styled.button`
  background-color: #603939;
`;
const NextWorkoutText = styled(Blurb)`
  font-size: 1.2rem;
`;

const ResumeBanner = styled.div`
  background-color: #2d4a45;
  border: 1px solid #03b7ad;
  padding: 15px 24px;
  border-radius: 6px;
  margin-top: 30px;
  text-align: center;

  span {
    color: #e2e2e2;
    font-family: "Source Sans 3", sans-serif;
  }
`;
