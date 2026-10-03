import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import { CircutTimer } from "./CircuitTimer";
import { ManualCircuitTimer } from "./ManualCircuitTimer";
import { useProgram } from "./useProgram";
import { useStopwatch } from "./useStopwatch";
import { useCue } from "./useCue";
import { useStats } from "./useStats";
import { useWorkouts } from "./useWorkouts";
import { useAuth } from "./AuthContext";
import { LoginScreen } from "./LoginScreen";
import { ImportBanner } from "./ImportBanner";
import { ProgressScreen } from "./ProgressScreen";
import { SetLogger } from "./SetLogger";
import { WorkoutEditor } from "./WorkoutEditor";
import { flushOutbox, recordSession } from "./sessionSync";
import { errorMessage } from "./api";
import { getFormattedCountdown, getCueDuration } from "./utils";
import { ACCENT, Muted, QuietButton, DangerButton } from "./ui";
import trainerIcon from "./assets/trainer_icon.png";
import styled from "styled-components";
import { ToastContainer, toast } from "react-toastify";
import { useWakeLock } from "./useWakeLock";

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

// Saved sessions from before the API only have a title; newer ones also have the workout id.
const findSavedProgram = (programs, saved) =>
  programs?.find((p) => (saved.workoutId != null ? p.id === saved.workoutId : p.title === saved.workoutTitle));

function App() {
  const { user, logout } = useAuth();

  return (
    <>
      <ToastContainer theme="dark" />
      <Header>
        <CircuitTrainerLogo src={trainerIcon} className="logo" alt="Circuit Trainer Logo" />
        <CircuitTrainerText>Circuit Trainer</CircuitTrainerText>
        {user && (
          <UserLine>
            {user.username} · <LinkButton onClick={logout}>Log out</LinkButton>
          </UserLine>
        )}
      </Header>
      {/* key: a different user gets a completely fresh component tree, with no leftover state. */}
      {user ? <TrainerApp key={user.username} username={user.username} /> : <LoginScreen />}
    </>
  );
}

function TrainerApp({ username }) {
  const [view, setView] = useState("workouts");
  const [editingProgram, setEditingProgram] = useState(null);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [workoutStarted, setWorkoutStarted] = useState(false);
  const [phase, setPhase] = useState("exercise");
  // undefined = nothing to log; { saving: true } while the completion is being sent;
  // then { session, queued } (session is null if the save was queued offline or failed).
  const [completion, setCompletion] = useState(undefined);
  const [pendingResume, setPendingResume] = useState(readSession);

  const { workouts, error: workoutsError, reload: reloadWorkouts, save, copy, remove } = useWorkouts();
  const { stats, refresh: refreshStats, getStatsFor } = useStats();
  const isManual = selectedProgram?.type === "manual";

  // Sessions that couldn't be saved earlier (offline, server asleep) are sent on start-up.
  useEffect(() => {
    flushOutbox(username).then((sent) => {
      if (sent > 0) {
        toast.success(`Synced ${sent} workout${sent === 1 ? "" : "s"} saved while offline.`, { toastId: "outbox-synced" });
        refreshStats();
      }
    });
  }, [username, refreshStats]);

  // A saved in-progress session for a workout that no longer exists can't be resumed.
  const resumeProgram = pendingResume && workouts ? findSavedProgram(workouts, pendingResume) : null;
  useEffect(() => {
    if (pendingResume && workouts && !resumeProgram) {
      clearSession();
      setPendingResume(null);
    }
  }, [pendingResume, workouts, resumeProgram]);

  const steps = useMemo(() => {
    if (!selectedProgram) return undefined;
    if (isManual) return selectedProgram.exercises;
    return selectedProgram.sections
      .reduce((acc, section) => {
        return acc.concat(section.units.map((unit) => ({ sectionId: section.id, ...unit })));
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
    steps || [],
    pendingResume?.position ?? 0
  );

  const { request, release } = useWakeLock();
  const { play } = useCue();

  const { elapsedSeconds: breakElapsedSeconds, reset: resetBreakStopwatch } = useStopwatch(phase === "break");
  const { elapsedSeconds: totalElapsedSeconds, reset: resetTotalStopwatch } = useStopwatch(
    workoutStarted && phase !== "end"
  );

  useEffect(() => {
    if (!selectedProgram || !workoutStarted || phase === "end") return;
    writeSession({ workoutId: selectedProgram.id, workoutTitle: selectedProgram.title, position, phase });
  }, [selectedProgram, workoutStarted, phase, position]);

  useEffect(() => {
    if (phase !== "break" || !program?.restSeconds) return;
    const remaining = program.restSeconds - breakElapsedSeconds;
    const cueDuration = getCueDuration(remaining);
    if (cueDuration) play(cueDuration);
  }, [phase, breakElapsedSeconds, program?.restSeconds, play]);

  // Saves the completion right away (so it's never lost), then the end screen offers to add sets.
  const completeWorkout = useCallback(() => {
    release();
    clearSession();
    setPhase("end");
    setCompletion({ saving: true });
    recordSession(username, {
      workoutId: selectedProgram.id,
      workoutTitle: selectedProgram.title,
      completedAt: new Date().toISOString(),
      totalSeconds: totalElapsedSeconds,
    })
      .then((session) => {
        setCompletion({ session, queued: session === null });
        refreshStats();
      })
      .catch((err) => {
        toast.error(errorMessage(err));
        setCompletion({ session: null, queued: false });
      });
  }, [release, username, selectedProgram, totalElapsedSeconds, refreshStats]);

  const handleWorkoutComplete = useCallback(() => {
    if (!last) {
      next();
    } else {
      completeWorkout();
    }
  }, [last, next, completeWorkout]);

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
      completeWorkout();
    } else {
      resetBreakStopwatch();
      setPhase("break");
    }
  }, [last, resetBreakStopwatch, play, completeWorkout]);

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
    setCompletion(undefined);
    reset();
    resetBreakStopwatch();
    resetTotalStopwatch();
    // Sets logged on the end screen change volume and progress; the list should reflect them.
    refreshStats();
  }, [release, reset, resetBreakStopwatch, resetTotalStopwatch, refreshStats]);

  const handleProgramClick = (program) => {
    setSelectedProgram(program);
  };

  const handleBackButton = () => {
    setSelectedProgram(null);
  };

  const handleResume = useCallback(() => {
    if (!resumeProgram) return;
    setSelectedProgram(resumeProgram);
    setWorkoutStarted(true);
    setPhase(pendingResume.phase);
    setPendingResume(null);
  }, [pendingResume, resumeProgram]);

  const handleDiscardResume = useCallback(() => {
    clearSession();
    setPendingResume(null);
  }, []);

  const handleCopy = async (program) => {
    try {
      const copied = await copy(program.id);
      toast.success(`Copied as "${copied.title}". You can edit it now.`);
      setEditingProgram(copied);
      setView("editor");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const handleDelete = async (program) => {
    if (!window.confirm(`Delete "${program.title}"? Your logged history for it is kept.`)) return;
    try {
      await remove(program.id);
      refreshStats();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const handleSaveWorkout = async (id, request) => {
    await save(id, request);
    setEditingProgram(null);
    setView("workouts");
  };

  const showSectionTitle = workoutStarted && !isManual && phase !== "end";

  if (selectedProgram) {
    return (
      <>
        <WorkoutContainer>
          <CenterHorizontal>
            <WorkoutTitle>
              {showSectionTitle ? (
                <>
                  {(sectionMapping[program.sectionId] ?? []).map((text) => (
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
              <EndSummary>
                <WorkoutTitle>Workout Complete!</WorkoutTitle>
                <TotalTimeText>
                  Total Time:{" "}
                  <strong>
                    {getFormattedCountdown(Math.floor(totalElapsedSeconds / 60), totalElapsedSeconds % 60)}
                  </strong>
                </TotalTimeText>
                {completion?.saving ? (
                  <Muted>Saving…</Muted>
                ) : (
                  completion && (
                    <SetLogger
                      program={selectedProgram}
                      session={completion.session}
                      queued={completion.queued}
                      onDone={handleReturnToList}
                    />
                  )
                )}
              </EndSummary>
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
                {/* The API sanitizes descriptions against an allowlist before storing them. */}
                <div dangerouslySetInnerHTML={{ __html: selectedProgram.description ?? "" }} />
              </Blurb>
              <CenterHorizontal>
                <StartWorkoutButton onClick={handleBackButton}>Back to List</StartWorkoutButton>
                <StartWorkoutButton onClick={handleStartWorkout}>Start Workout</StartWorkoutButton>
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
          {workoutStarted && phase !== "end" && <ResetButton onClick={handleResetWorkout}>Reset</ResetButton>}
        </Container>
      </>
    );
  }

  return (
    <>
      <Tabs role="tablist">
        <Tab role="tab" aria-selected={view !== "progress"} $active={view !== "progress"} onClick={() => setView("workouts")}>
          Workouts
        </Tab>
        <Tab role="tab" aria-selected={view === "progress"} $active={view === "progress"} onClick={() => setView("progress")}>
          Progress
        </Tab>
      </Tabs>

      {view === "progress" && <ProgressScreen stats={stats} refreshStats={refreshStats} />}

      {view === "editor" && (
        <WorkoutEditor
          key={editingProgram?.id ?? "new"}
          program={editingProgram}
          onSave={handleSaveWorkout}
          onCancel={() => {
            setEditingProgram(null);
            setView("workouts");
          }}
        />
      )}

      {view === "workouts" && (
        <>
          <ImportBanner username={username} onImported={refreshStats} />
          {resumeProgram && (
            <ResumeBanner>
              <span>
                Resume <strong>{resumeProgram.title}</strong>?
              </span>
              <CenterHorizontal>
                <StartWorkoutButton onClick={handleDiscardResume}>Discard</StartWorkoutButton>
                <StartWorkoutButton onClick={handleResume}>Resume</StartWorkoutButton>
              </CenterHorizontal>
            </ResumeBanner>
          )}
          {workoutsError && (
            <ErrorBox>
              {workoutsError} <QuietButton onClick={reloadWorkouts}>Retry</QuietButton>
            </ErrorBox>
          )}
          {!workouts && !workoutsError && <Muted>Loading workouts…</Muted>}
          <WorkoutList>
            {workouts?.map((item) => (
              <WorkoutListItem
                key={item.id}
                program={item}
                stats={getStatsFor(item)}
                onStart={handleProgramClick}
                onCopy={handleCopy}
                onEdit={(p) => {
                  setEditingProgram(p);
                  setView("editor");
                }}
                onDelete={handleDelete}
              />
            ))}
          </WorkoutList>
          {workouts && (
            <QuietButton
              onClick={() => {
                setEditingProgram(null);
                setView("editor");
              }}
            >
              + New workout
            </QuietButton>
          )}
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
  gap: 12px;
`;

const ItemSubtitle = styled.div`
  color: #a0a0a0;
  font-weight: 400;
  font-size: 0.85rem;
  margin-top: 4px;
`;

const ItemActions = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  flex-shrink: 0;
`;

const SmallActions = styled.div`
  display: flex;
  gap: 6px;
  justify-content: flex-end;
`;

const WorkoutListItem = ({ program, stats, onStart, onCopy, onEdit, onDelete }) => {
  const subtitle = useMemo(() => {
    const ownership = program.builtIn ? null : "Custom";
    if (!stats || stats.timesCompleted === 0) return ownership;
    const sessionWord = stats.timesCompleted === 1 ? "session" : "sessions";
    if (stats.currentWeek && program.programWeeks) {
      return `Week ${stats.currentWeek} of ${program.programWeeks} · ${stats.timesCompleted} ${sessionWord}`;
    }
    const lastDate = stats.lastCompletedAt ? new Date(stats.lastCompletedAt).toLocaleDateString() : null;
    return `${stats.timesCompleted} ${sessionWord}${lastDate ? ` · last ${lastDate}` : ""}`;
  }, [stats, program.programWeeks, program.builtIn]);

  return (
    <WorkoutItem>
      <div>
        <span>{program.title}</span>
        {subtitle && <ItemSubtitle>{subtitle}</ItemSubtitle>}
      </div>
      <ItemActions>
        <button onClick={() => onStart(program)}> start </button>
        <SmallActions>
          {program.builtIn ? (
            <QuietButton onClick={() => onCopy(program)} title="Copy into your own editable workouts">
              copy
            </QuietButton>
          ) : (
            <>
              <QuietButton onClick={() => onEdit(program)}>edit</QuietButton>
              <DangerButton onClick={() => onDelete(program)} aria-label={`Delete ${program.title}`}>
                ×
              </DangerButton>
            </>
          )}
        </SmallActions>
      </ItemActions>
    </WorkoutItem>
  );
};

const Container = styled.div``;

const NextContainer = styled.div``;

export const CenterHorizontal = styled.div`
  display: flex;
  justify-content: space-around;
`;

const Header = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  margin-bottom: 12px;
`;
const CircuitTrainerLogo = styled.img`
  height: 4em;
`;
const CircuitTrainerText = styled.h1`
  font-size: 1.9rem;
  font-family: "Revalia", sans-serif;
`;

const UserLine = styled.div`
  color: #a0a0a0;
  font-size: 0.85rem;
  font-family: "Source Sans 3", sans-serif;
`;

const LinkButton = styled.button`
  background: none;
  border: none;
  padding: 0;
  color: ${ACCENT};
  font-size: inherit;
`;

const Tabs = styled.div`
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 8px;
`;

const Tab = styled.button`
  background: ${(p) => (p.$active ? "#414141" : "none")};
  color: ${(p) => (p.$active ? ACCENT : "#a0a0a0")};
  border: 1px solid ${(p) => (p.$active ? ACCENT : "#5f5e5a")};
  font-weight: 600;
`;

const WorkoutContainer = styled.div`
  background-color: #414141;
  padding: 21px;
  border-radius: 18px;
  margin-top: 30px;
  margin-bottom: 30px;
  text-align: left;
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
  margin-top: 15px;
  margin-bottom: 15px;
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

const ErrorBox = styled.div`
  color: #e7a0a0;
  margin-top: 20px;
  font-family: "Source Sans 3", sans-serif;
`;
