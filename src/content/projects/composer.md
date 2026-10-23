---
title: composer
summary: Feed it the sheet music from your favourite retro video game; out comes a chill bossa style composition ideal for programming in a Gameboy - I personally recommend LSDJ.
order: 25
diagram: ./composer.svg
diagramAlt: A piano score from a game soundtrack goes in as MusicXML. The composer service in the cluster splits it into melody, bass and harmony, decodes each bar's chord from the score itself, then arranges it as bossa nova - by rule, or with a language model on the PC's GPU choosing density, bass feel and substitutions. Out come five staves - four for Game Boy channels in LSDj and one for the alto sax, played live.
---

Piano transcriptions of game music go in; it works out which notes are the
tune, which are the bass and which are the harmony, then rewrites the lot as a
chill bossa nova. The harmony is read out of the original score, never made
up, so the level theme still sounds like the level theme - just with a
cross-stick clave under it.

Four parts land on a Game Boy's four sound channels, which is exactly enough
and not one more. The fifth part is mine: the melody on alto sax, live, over
the top. The rules do the grooves; a language model on the PC's GPU can be
asked for the taste calls - where to thin out, which chord substitution a
moment deserves - and was firmly kept away from writing the notes after it
spent ten minutes getting 8 bars of 32 right.
