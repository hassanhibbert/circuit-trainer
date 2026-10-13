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
import { getCueDuration } from "./utils";
import { Button, Muted, Page } from "./ui";
import { Shell } from "./Shell";
import { WorkoutList } from "./WorkoutList";
import { WorkoutDetail } from "./WorkoutDetail";
import { CompleteScreen, WorkoutScreen } from "./WorkoutScreen";
import styled from "styled-components";
import { toast } from "react-toastify";
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

const findSavedProgram = (programs, saved) =>
  programs?.find((p) => (saved.workoutId != null ? p.id === saved.workoutId : p.title === saved.workoutTitle));

function App() {
  const { user, logout } = useAuth();

  return (
    <>
      {user ? <TrainerApp key={user.username} username={user.username} onLogout={logout} /> : <LoginScreen />}
    </>
  );
}

function TrainerApp({ username, onLogout }) {
  const [view, setView] = useState("workouts");
  const [editingProgram, setEditingProgram] = useState(null);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [workoutStarted, setWorkoutStarted] = useState(false);
  const [phase, setPhase] = useState("exercise");
  // undefined | { saving } | { session, queued }
  const [completion, setCompletion] = useState(undefined);
  const [pendingResume, setPendingResume] = useState(readSession);

  const { workouts, error: workoutsError, reload: reloadWorkouts, save, copy, remove } = useWorkouts();
  const { stats, refresh: refreshStats, getStatsFor } = useStats();
  const isManual = selectedProgram?.type === "manual";

  useEffect(() => {
    flushOutbox(username).then((sent) => {
      if (sent > 0) {
        toast.success(`Synced ${sent} workout${sent === 1 ? "" : "s"} saved while offline.`, { toastId: "outbox-synced" });
        refreshStats();
      }
    });
  }, [username, refreshStats]);

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

  // save right away, sets get added after
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

  const handleEndWorkout = () => {
    if (window.confirm("End this workout? It won't be saved.")) handleResetWorkout();
  };

  if (selectedProgram && workoutStarted && phase === "end") {
    return (
      <CompleteScreen title={selectedProgram.title} totalSeconds={totalElapsedSeconds}>
        {completion?.saving ? (
          <Muted style={{ textAlign: "center", marginTop: 16 }}>Saving…</Muted>
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
      </CompleteScreen>
    );
  }

  if (selectedProgram && workoutStarted) {
    const upcoming = getNextWorkout();
    return (
      <WorkoutScreen
        title={selectedProgram.title}
        sectionLines={isManual ? null : sectionMapping[program.sectionId]}
        position={position}
        total={steps.length}
        nextTitle={upcoming && [upcoming.title, upcoming.setLabel].filter(Boolean).join(" · ")}
        onEnd={handleEndWorkout}
      >
        {isManual ? (
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
        )}
      </WorkoutScreen>
    );
  }

  if (selectedProgram) {
    return (
      <WorkoutDetail
        program={selectedProgram}
        stats={getStatsFor(selectedProgram)}
        onBack={handleBackButton}
        onStart={handleStartWorkout}
      />
    );
  }

  return (
    <Shell view={view} onNavigate={setView} username={username} onLogout={onLogout}>
      {view === "progress" && (
        <Page $wide>
          <ProgressScreen stats={stats} refreshStats={refreshStats} />
        </Page>
      )}

      {view === "editor" && (
        <Page>
          <WorkoutEditor
            key={editingProgram?.id ?? "new"}
            program={editingProgram}
            onSave={handleSaveWorkout}
            onCancel={() => {
              setEditingProgram(null);
              setView("workouts");
            }}
          />
        </Page>
      )}

      {view === "workouts" && (
        <Page $wide>
          <ImportBanner username={username} onImported={refreshStats} />
          {resumeProgram && (
            <Banner>
              <span>
                Pick up where you left off in <strong>{resumeProgram.title}</strong>?
              </span>
              <BannerActions>
                <Button $variant="ghost" $size="sm" onClick={handleDiscardResume}>
                  Discard
                </Button>
                <Button $variant="primary" $size="sm" onClick={handleResume}>
                  Resume
                </Button>
              </BannerActions>
            </Banner>
          )}
          {workoutsError && (
            <Banner $error>
              <span>{workoutsError}</span>
              <Button $variant="ghost" $size="sm" onClick={reloadWorkouts}>
                Retry
              </Button>
            </Banner>
          )}
          {!workouts && !workoutsError && <Muted style={{ marginTop: 24 }}>Loading workouts…</Muted>}
          {workouts && (
            <WorkoutList
              workouts={workouts}
              getStatsFor={getStatsFor}
              onOpen={handleProgramClick}
              onCopy={handleCopy}
              onEdit={(p) => {
                setEditingProgram(p);
                setView("editor");
              }}
              onDelete={handleDelete}
              onNew={() => {
                setEditingProgram(null);
                setView("editor");
              }}
            />
          )}
        </Page>
      )}
    </Shell>
  );
}

export default App;

export const Banner = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
  padding: 14px 16px;
  border-radius: var(--radius);
  border: 1px solid ${(p) => (p.$error ? "rgba(236, 143, 143, 0.4)" : "rgba(0, 183, 172, 0.45)")};
  background: ${(p) => (p.$error ? "var(--danger-soft)" : "var(--accent-soft)")};
`;

const BannerActions = styled.div`
  display: flex;
  gap: 8px;
`;
