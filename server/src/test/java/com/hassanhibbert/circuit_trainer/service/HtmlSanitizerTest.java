package com.hassanhibbert.circuit_trainer.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class HtmlSanitizerTest {
    private final HtmlSanitizer sanitizer = new HtmlSanitizer();

    @Test
    void keepsBasicFormatting() {
        assertThat(sanitizer.sanitize("<p>Rest <strong>60s</strong></p><ul><li>Swing</li></ul>"))
                .isEqualTo("<p>Rest <strong>60s</strong></p><ul><li>Swing</li></ul>");
    }

    @Test
    void stripsScriptsEventHandlersAndJavascriptUrls() {
        String dirty = "<p onclick=\"steal()\">Hi</p><script>steal()</script>"
                + "<img src=x onerror=steal()><a href=\"javascript:steal()\">link</a>";

        String clean = sanitizer.sanitize(dirty);

        assertThat(clean).doesNotContain("script", "onclick", "onerror", "<img", "javascript:");
        assertThat(clean).contains("Hi", "link");
    }

    @Test
    void blankBecomesNull() {
        assertThat(sanitizer.sanitize("   ")).isNull();
        assertThat(sanitizer.sanitize(null)).isNull();
    }
}
