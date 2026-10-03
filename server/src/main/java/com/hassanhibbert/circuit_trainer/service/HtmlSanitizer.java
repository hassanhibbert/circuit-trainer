package com.hassanhibbert.circuit_trainer.service;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.safety.Safelist;
import org.springframework.stereotype.Component;

/**
 * Workout descriptions are rendered as HTML by the frontend (dangerouslySetInnerHTML), so
 * a description like {@code <img src=x onerror="steal(localStorage.token)">} would run
 * script in the user's browser: stored XSS. Sanitizing on the way in, against an allowlist,
 * means whatever the database holds is already safe to render.
 *
 * Allowlist, not blocklist: list the few tags that are fine (p, strong, em, ul, li...) and
 * drop everything else. A blocklist would have to anticipate every dangerous construct.
 */
@Component
public class HtmlSanitizer {

    private static final Safelist SAFELIST = Safelist.basic();
    private static final Document.OutputSettings OUTPUT = new Document.OutputSettings().prettyPrint(false);

    /** Returns null for null or blank input, so "no description" has a single representation. */
    public String sanitize(String html) {
        if (html == null || html.isBlank()) {
            return null;
        }
        return Jsoup.clean(html, "", SAFELIST, OUTPUT);
    }
}
