package com.hassanhibbert.circuit_trainer.service;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.safety.Safelist;
import org.springframework.stereotype.Component;

@Component
public class HtmlSanitizer {
    private static final Safelist SAFELIST = Safelist.basic();
    private static final Document.OutputSettings OUTPUT = new Document.OutputSettings().prettyPrint(false);

    public String sanitize(String html) {
        if (html == null || html.isBlank()) {
            return null;
        }
        return Jsoup.clean(html, "", SAFELIST, OUTPUT);
    }
}
