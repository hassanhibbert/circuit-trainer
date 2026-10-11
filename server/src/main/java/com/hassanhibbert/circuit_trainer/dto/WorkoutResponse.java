package com.hassanhibbert.circuit_trainer.dto;

import com.hassanhibbert.circuit_trainer.entity.Workout;
import com.hassanhibbert.circuit_trainer.entity.WorkoutExercise;
import com.hassanhibbert.circuit_trainer.entity.WorkoutMode;
import com.hassanhibbert.circuit_trainer.entity.WorkoutSection;

import java.util.List;

public record WorkoutResponse(
        Long id,
        String title,
        String description,
        WorkoutMode mode,
        Integer sessionsPerWeek,
        Integer programWeeks,
        boolean builtIn,
        List<Section> sections
) {
    public record Section(Long id, List<String> titleLines, List<Exercise> exercises) {
        static Section fromEntity(WorkoutSection section) {
            List<String> lines = section.getTitle() == null ? List.of() : List.of(section.getTitle().split("\n"));
            return new Section(section.getId(), lines,
                    section.getExercises().stream().map(Exercise::fromEntity).toList());
        }
    }

    public record Exercise(Long id, String title, String modifier, String setLabel, String reps,
                           Integer targetReps, Integer durationSeconds, Integer restSeconds) {
        static Exercise fromEntity(WorkoutExercise e) {
            return new Exercise(e.getId(), e.getTitle(), e.getModifier(), e.getSetLabel(), e.getReps(),
                    e.getTargetReps(), e.getDurationSeconds(), e.getRestSeconds());
        }
    }

    public static WorkoutResponse fromEntity(Workout w) {
        return new WorkoutResponse(w.getId(), w.getTitle(), w.getDescription(), w.getMode(),
                w.getSessionsPerWeek(), w.getProgramWeeks(), w.isBuiltIn(),
                w.getSections().stream().map(Section::fromEntity).toList());
    }
}
