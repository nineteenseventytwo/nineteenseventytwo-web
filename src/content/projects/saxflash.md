---
title: SaxFlash
summary: An alto sax that lights up in the colour of the note being played.
order: 30
diagram: ./saxflash.svg
diagramAlt: A work-in-progress plan. A mic hears the alto saxophone and a vibration sensor feels the horn being slapped. A small microcontroller runs an FFT on the sound, picks the note in the alto range, about 139 to 831 hertz, and lights LED strips soldered along the sax in that note's colour, one of twelve; a slap triggers a flash effect. A lithium battery pack through a step-down converter powers everything, so nothing is cabled to the wall.
---

**Under construction** - this is the plan, not the build.

LED strips soldered along an alto sax, a small microcontroller listening
through a mic, and an FFT picking out the note being played. Each of the
twelve notes gets its own colour, so a scale runs the rainbow. Slap the horn
and a vibration sensor sets off a flash on top. A lithium pack and a step-down
converter power the lot, so it plays like an ordinary sax with nothing
plugged into the wall.
