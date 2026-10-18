# Video verification

- Final artifact: `Graphline_Full_Project_Demo.mp4`, copied to repository `demo.mp4`.
- Duration: 230.083 seconds.
- Video: H.264, 1920 by 1080, 24 frames per second.
- Audio: AAC, 48 kHz, stereo. Mean level -16.3 dB, maximum -1.5 dB.
- File size: 39,172,476 bytes.
- Visual source: continuous Playwright browser recording of the real local app and a clearly labeled read-only query presenter. Typing, clicks, replies and graph operations were performed during the take.
- Eleven chapter frames were extracted from the encoded MP4 and visually inspected. The contact sheet is in `qa/contact-sheet.jpg`.
- HyperFrames final checks passed with zero runtime, layout or contrast errors. Three timeline-density warnings remain because chapter labels share tracks; these concern editor organization rather than video content.
- The screen source was encoded with one-second keyframes to keep browser seeking reliable.
- Single-worker streaming render completed using Chrome screenshot capture and hardware GPU. It avoids storing every output frame on disk.
- The narration describes graph-policy behavior. The optional OpenRouter path is explained but is not exercised. No real WhatsApp connection or completed human reply is claimed.
- Capture uses the isolated synthetic `antiinterns_recording_demo` graph. The normal prototype's `antiinterns_support` graph and application were preserved.
