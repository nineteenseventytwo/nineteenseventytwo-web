---
title: 8 Bit Sax Lounge
summary: A live sax stream where the chat drives the effects pedals.
order: 20
diagram: ./8bsl.svg
diagramAlt: A viewer types a command such as !engine room in Twitch chat. The chat bot in the Kubernetes cluster receives it, asks the MIDI service to change the effect, and publishes an event. The MIDI service saves the new state through the data API in CouchDB and forwards the change to the Windows PC, which sends a MIDI message to the reverb pedal on the saxophone's signal. The overlay service turns the event into an on-screen update in OBS, and OBS streams the result back to Twitch.
---

Type `!engine room` in chat and the reverb on my saxophone changes, live, a
second later - and the overlay on the stream shows who did it.

It is deliberately overengineered: what could be one script is six services
across a Raspberry Pi cluster and a PC, because the point was to learn how
real systems are put together. Chat commands become MIDI messages to a real
Ventris Dual Reverb pedal; every change is saved, so the pedal, the database
and the overlay agree on what is playing.
