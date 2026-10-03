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

/**
 * Calendar-week arithmetic. "This week" depends on where the user is: Sunday 11pm in New York
 * is already Monday in UTC. So every calculation takes the user's ZoneId, sent by the app.
 * Weeks start on Monday (ISO-8601).
 */
public final class WeekCalendar {

    private WeekCalendar() {}

    /** Parses an IANA zone id such as "America/New_York"; a bad value is a 400, not a 500. */
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

    /** The instant this calendar week began (Monday 00:00) in the user's zone. */
    public static Instant startOfThisWeek(Clock clock, ZoneId zone) {
        return weekStart(today(clock, zone)).atStartOfDay(zone).toInstant();
    }

    /**
     * Which week of a multi-week program the user is in: week 1 is the calendar week of their
     * first session, and it advances every Monday whether or not they trained. Capped at the
     * program length. (The old app counted sessions / 3, which drifted with missed workouts.)
     */
    public static int programWeek(Instant firstSession, LocalDate today, ZoneId zone, int programWeeks) {
        LocalDate firstWeek = weekStart(firstSession.atZone(zone).toLocalDate());
        long elapsed = ChronoUnit.WEEKS.between(firstWeek, weekStart(today));
        return (int) Math.max(1, Math.min(programWeeks, elapsed + 1));
    }
}
