# Minigame transition cue

`mini-game-with-ding.mp3` is an unmodified copy of the user-supplied
`mini_game_with_ding.mp3`. It plays only after an explicit Challenge click.

Timing measured against the supplied `ScreenRecording_10-03-2026 11-56-18_1.mov`:

- Decoded MP3: 5.0188 seconds (5.0678 seconds including MP3 frame padding).
- Reference recording: 2.4288 seconds.
- Cross-correlation of decoded mono audio places the reference's audio at
  +0.9878 seconds in the MP3.
- Reference title first enters at approximately 1.40 seconds, giving a title
  cue at approximately 2.39 seconds in the MP3.
- Icon appears with the MP3's opening ding; text pops at 2.39 seconds and settles
  0.43 seconds later. Fade occupies the final 6% of the sound.

`minigame-transition.js` samples the audio playback time each animation frame.
Visuals and camera therefore stay on that clock, including while audio buffers.
If playback fails or stalls, a bounded silent fallback continues into the normal
challenge screen. Navigation cancels audio and the continuation together.

The reference video is used for timing only; no reference artwork is included.
