package com.hassanhibbert.circuit_trainer.service;

import com.hassanhibbert.circuit_trainer.exception.InvalidQueryException;

import java.time.Clock;
import java.time.DateTimeException;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;

public final class WeekCalendar {
    private WeekCalendar() {}

    public static ZoneId zone(String tz) {
        try {
            return ZoneId.of(tz);
        } catch (DateTimeException e) {
            throw new InvalidQueryException("Unknown time zone '" + tz + "'. Use an IANA id such as America/New_York");
        }
    }

    public static LocalDate today(Clock clock, ZoneId zone) {
        return LocalDate.now(clock.withZone(zone));
    }

    public static LocalDate weekStart(LocalDate date) {
        return date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
    }

    public static Instant startOfThisWeek(Clock clock, ZoneId zone) {
        return weekStart(today(clock, zone)).atStartOfDay(zone).toInstant();
    }

    public static int programWeek(Instant firstSession, LocalDate today, ZoneId zone, int programWeeks) {
        LocalDate firstWeek = weekStart(firstSession.atZone(zone).toLocalDate());
        long elapsed = ChronoUnit.WEEKS.between(firstWeek, weekStart(today));
        return (int) Math.max(1, Math.min(programWeeks, elapsed + 1));
    }
}
