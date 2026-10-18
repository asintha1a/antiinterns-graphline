# Graphline full project demo source

A 230.07 second continuous browser walkthrough, with camera reframing, chapter labels, captions and local Samantha narration. The screen recording is the primary visual throughout. There are no screenshot slides.

## Files

- `index.html`: editable HyperFrames composition.
- `assets/screen.mp4`: continuous recorded browser source.
- `assets/*.wav`: narration segments synthesized locally with macOS speech.
- `scripts/plan.json`: narration and chapter copy.
- `timing.json`: measured speech and chapter durations.
- `capture-events.json`: actual interaction timings and focus targets.
- `Graphline_Demo_Captions.srt`: caption file for YouTube.
- `scripts/build-composition.py`: rebuilds the composition and caption file.
- `../../tools/record-full-demo.cjs`: records actual browser actions and real read-only FalkorDB queries. Its presenter page is a recording aid, not an application feature.

The local editable bundle contains the recorded screen source and narration. These generated media files are excluded from the public Git repository to keep it small. To recreate them from the repository, use the recording and voice scripts below first.

## Rebuild the edit

Keep the current recorded source and narration, then run the commands below. System font files are excluded from the public repository. The font preparation script copies installed Arial on macOS; other systems can use its open Arimo alternative. Slight typography differences may occur across systems.

```bash
./scripts/prepare-fonts.sh
python3 scripts/build-composition.py
npm run check
npm run dev
npm run render -- --fps 24 --workers 1 --low-memory-mode --output ../../demo.mp4
```

The one-worker streaming option avoids storing thousands of complete output frames on disk. HyperFrames is pinned in package.json. FFmpeg and Node.js 22 or later are needed for this production toolchain; the application itself supports Node.js 20 or later.

## Make a new recording on macOS

Run FalkorDB with the repository's Docker Compose file. Install Playwright in a temporary tooling environment, or point `PLAYWRIGHT_MODULE` at an existing installation. Its FFmpeg helper must be installed with `playwright install ffmpeg`. Chrome is currently configured at the standard macOS application path in the capture script.

```bash
# From the application repository root:
node tools/record-full-demo.cjs
```

The capture tool creates a separate `antiinterns_recording_demo` graph with synthetic data and an app instance on 4174. Its read-only presenter uses port 4175. It does not use the normal application graph. A new take resets only that explicitly named recording graph. It writes a continuous WebM under `assets/capture.webm` and stores its lead-in offset in `capture-events.json`. Run `python3 scripts/prepare-screen.py` from the video project directory to trim that lead-in and encode `assets/screen.mp4` with H.264 and one-second keyframes before rebuilding the edit. Raw takes and local render caches are ignored in Git.

For changed narration, edit `scripts/plan.json`, run `python3 scripts/generate-voice.py`, record again, then rebuild. Speech timing determines chapter duration.

## Motion and provenance

The composition follows HyperFrames core, animation, keyframes, creative and CLI guidance. Camera moves use the viewport-change rule. Chapter entrances adapt the kicker/name/baseline motion from the installed `lt-kicker-name` registry block; the original source snippet is kept in `references/`.

All counts, tickets, replies and memory shown in the footage were read from the working local application or queried directly from FalkorDB. No model API is called in this take. No private WhatsApp data, API key, real customer information or authentication screen appears.
