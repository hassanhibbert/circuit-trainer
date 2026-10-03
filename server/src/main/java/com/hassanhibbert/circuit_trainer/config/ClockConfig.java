package com.hassanhibbert.circuit_trainer.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

/**
 * "Now" as an injectable dependency. Code that calls Instant.now() directly can't be tested
 * for "which week is it?" logic; code that asks a Clock can be handed a fixed one in tests.
 */
@Configuration
public class ClockConfig {

    @Bean
    Clock clock() {
        return Clock.systemUTC();
    }
}
