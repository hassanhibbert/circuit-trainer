package com.hassanhibbert.circuit_trainer.service;

import com.hassanhibbert.circuit_trainer.dto.GoalResponse.Progress;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class GoalProgressCalculatorTest {
    private static BigDecimal lb(String value) {
        return new BigDecimal(value);
    }

    @Test
    void lossGoal_reportsShareOfDistanceCovered() {
        Progress p = GoalProgressCalculator.weight(lb("230"), lb("221"), lb("200"));

        assertThat(p.percent()).isEqualTo(30);
        assertThat(p.achieved()).isFalse();
        assertThat(p.currentValue()).isEqualByComparingTo("221");
    }

    @Test
    void gainGoal_worksInTheOtherDirection() {
        Progress p = GoalProgressCalculator.weight(lb("150"), lb("155"), lb("160"));

        assertThat(p.percent()).isEqualTo(50);
        assertThat(p.achieved()).isFalse();
    }

    @Test
    void overshootingTheTarget_isCappedAt100AndAchieved() {
        Progress p = GoalProgressCalculator.weight(lb("230"), lb("195.5"), lb("200"));

        assertThat(p.percent()).isEqualTo(100);
        assertThat(p.achieved()).isTrue();
    }

    @Test
    void movingAwayFromTheTarget_isFlooredAt0() {
        Progress p = GoalProgressCalculator.weight(lb("230"), lb("236"), lb("200"));

        assertThat(p.percent()).isZero();
        assertThat(p.achieved()).isFalse();
    }

    @Test
    void noWeighInYet_hasNoProgress() {
        assertThat(GoalProgressCalculator.weight(lb("230"), null, lb("200"))).isEqualTo(Progress.NONE);
    }

    @Test
    void scaleDifferences_doNotMatter() {
        Progress p = GoalProgressCalculator.weight(lb("230.0"), lb("200.00"), lb("200"));

        assertThat(p.achieved()).isTrue();
        assertThat(p.percent()).isEqualTo(100);
    }

    @Test
    void sessionsPerWeek_countsTowardsTheTarget() {
        assertThat(GoalProgressCalculator.sessionsPerWeek(2, lb("3")))
                .isEqualTo(new Progress(BigDecimal.valueOf(2), 66, false));
        assertThat(GoalProgressCalculator.sessionsPerWeek(4, lb("3")).achieved()).isTrue();
        assertThat(GoalProgressCalculator.sessionsPerWeek(4, lb("3")).percent()).isEqualTo(100);
    }
}
