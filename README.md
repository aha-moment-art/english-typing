# A Little English

A quiet English typing practice site with a light lavender palette and a paper-like background. Type directly on the original text, one passage at a time.

Live site: <https://aha-moment-art.github.io/english-typing/>

## Practice

Choose a text and begin typing, or select Start typing. There is no separate visible input box or caret. Correct letters turn green; a wrong character flashes red for 450 ms and is removed for another try. Every preceding correct character is retained, including those in the current word, and historical errors remain in the accuracy calculation. Backspace removes the previous character. A completed passage advances after 800 ms while practice is focused and visible. Leaving the page cancels automatic advance; Continue or Enter resumes navigation. The final passage stays on its completion summary. You may also jump between passages, return to the library, or start the current passage over.

- Six classic works, ten excerpts each, with 40–100 words per passage.
- Soft typewriter clicks accompany typing; a distinct two-note cue marks errors. Sound is on by default and can be muted with “Sound: on/off”. The preference stays in this browser. Audio is synthesised locally and starts only after interaction; unavailable audio never blocks practice.
- Capitals, spaces and punctuation must match. Use straight quotes and two hyphens (`--`) for a long dash. Pasting and dropping text are disabled.
- Timing starts with the first character and pauses on Escape, Pause, or loss of practice/window/page focus. It stops on completion. On mobile, tap the passage or Start typing to open the keyboard.
- WPM = current correct characters ÷ 5 ÷ active minutes. Accuracy = historically correct input characters ÷ all input characters. Deleting does not undo earlier mistakes; replacing selected text counts as new input.
- The current text, passage, input, statistics and completed passages are saved locally. Restored practice starts paused. Starting over clears that passage's record.
- Practice records are never collected or uploaded. There are no accounts, trackers or third-party fonts. If browser storage is unavailable, a notice appears and practice remains available. Invalid records or records for changed passage text reset safely.

## Run locally and verify

No build step or runtime dependencies are required. Use an HTTP server rather than opening the HTML file directly:

```sh
python3 -m http.server 8000 --directory /absolute/path/to/english-typing
```

Open `http://localhost:8000`. With Node.js 20 or later, run `npm test`; no dependency installation is needed. Tests cover typing statistics, corrections, restoration and passage data.

## Add a text

1. Add a JSON file in `data/`, following `alice.json`. Preserve stable, unique book and passage IDs, the original `text`, `chapter`, word count (`words`), and work/source metadata.
2. Add its summary and relative `file` path to `data/catalog.json`. Cards and passage navigation are generated automatically. Do not reuse an existing passage ID for a different passage.
3. Use original texts whose rights permit reuse. Exclude modern translations, editorial notes and illustrations. Verify sources, split at sentence boundaries, and update `sources.html`.
4. Check practice and relative resource paths, then commit to `main`. Update the fixed book/passage counts in the data tests when expanding the library.

## Deployment

The public repository is published by GitHub Pages from the root of `main`. The `.nojekyll` file disables Jekyll processing. Relative asset paths and hash navigation support project subpaths and page refreshes.

## Sources and terms

See [Sources & Notes](sources.html) and the [complete Project Gutenberg licence](GUTENBERG-LICENSE.txt). The six original English works are listed by Project Gutenberg as public domain in the United States. Excerpts are not continuous and do not represent complete chapters. Only typographic characters are normalised; page numbers, footnote markers and decorative capitalisation are removed. Original wording is preserved, with passages drawn from original paragraphs and split at sentence boundaries. Chapters and sources are shown during practice.

Project Gutenberg's name and trademark do not imply endorsement of this site. When redistributing these eBook excerpts, retain source and licence information and comply with requirements applicable in your location. This site does not include eBook illustrations or modern translations.
