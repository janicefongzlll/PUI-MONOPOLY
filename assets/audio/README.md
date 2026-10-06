# Local game audio

All active audio comes from the files supplied by the user. No YouTube player is used.

- `opening-loop.m4a`: Opening.mp3, trimmed from 5 seconds through its end (28.622 seconds). Native loop until the first movement is selected.
- `gameplay-loop.m4a`: Game Play.mp3, trimmed to 0–31 seconds. Native loop; pauses for challenge narration and owner music, then resumes from its previous position.
- `frog.mp3`, `monkey.mp3`, `wolf.mp3`, `horse.mp3`: supplied team files, unchanged. Selected from the current landmark owner's animal identity at challenge entry; full-file loops.
- `minigame-narration.m4a`: AAC audio copied losslessly from mini game narration.mov. 1.916 seconds; existing transition retimed with title entrance at approximately 0.8 seconds, matching the supplied clip.
- `cash-register-kaching.mp3`: user-supplied Cash Register Cha-Ching sound, played once when a completed Landmark purchase reveals the acquisition screen. A lightweight browser-generated chime remains as a playback fallback.

`opening.mp3` and `gameplay.mp3` retain the original source files. The earlier `mini-game-with-ding.mp3` is retained but no longer used.

One native BGM element handles every music track. A separate narration element plays only during the transition, with BGM paused. An Enable music/Retry music button appears on playback failure. Navigation and game end stop all music; audio state never changes game calculations.
