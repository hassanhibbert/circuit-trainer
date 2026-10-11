package com.hassanhibbert.circuit_trainer.service;

import com.hassanhibbert.circuit_trainer.exception.InvalidQueryException;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class WeekCalendarTest {
    private static final ZoneId NEW_YORK = ZoneId.of("America/New_York");

    @Test
    void programWeek_isOneDuringTheWeekOfTheFirstSession() {
        Instant first = Instant.parse("2026-09-28T12:00:00Z");

        assertThat(WeekCalendar.programWeek(first, LocalDate.parse("2026-10-04"), NEW_YORK, 4)).isEqualTo(1);
        assertThat(WeekCalendar.programWeek(first, LocalDate.parse("2026-10-05"), NEW_YORK, 4)).isEqualTo(2);
    }

    @Test
    void programWeek_advancesWithTheCalendarAndIsCapped() {
        Instant first = Instant.parse("2026-09-01T12:00:00Z");

        assertThat(WeekCalendar.programWeek(first, LocalDate.parse("2026-09-22"), NEW_YORK, 4)).isEqualTo(4);
        assertThat(WeekCalendar.programWeek(first, LocalDate.parse("2026-12-25"), NEW_YORK, 4)).isEqualTo(4);
    }

    @Test
    void programWeek_usesTheUsersTimeZone() {
        Instant sundayNightInNewYork = Instant.parse("2026-09-28T02:00:00Z");

        assertThat(WeekCalendar.programWeek(sundayNightInNewYork, LocalDate.parse("2026-09-28"), NEW_YORK, 4))
                .isEqualTo(2);
        assertThat(WeekCalendar.programWeek(sundayNightInNewYork, LocalDate.parse("2026-09-28"), ZoneOffset.UTC, 4))
                .isEqualTo(1);
    }

    @Test
    void startOfThisWeek_isMondayMidnightInTheGivenZone() {
        Clock wednesday = Clock.fixed(Instant.parse("2026-09-30T15:00:00Z"), ZoneOffset.UTC);

        assertThat(WeekCalendar.startOfThisWeek(wednesday, NEW_YORK))
                .isEqualTo(Instant.parse("2026-09-28T04:00:00Z"));
    }

    @Test
    void unknownZone_isAClientError() {
        assertThatThrownBy(() -> WeekCalendar.zone("Mars/Olympus_Mons"))
                .isInstanceOf(InvalidQueryException.class);
    }
}
