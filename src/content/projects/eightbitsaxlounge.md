---
title: 8 Bit Sax Lounge
summary: A live sax stream where the chat drives the effects pedals.
order: 20
diagram: ./8bsl.svg
diagramAlt: A viewer types a command such as !engine room in Twitch chat. The chat bot in the Kubernetes cluster receives it, asks the MIDI service to change the effect, and publishes an event. The MIDI service saves the new state through the data API in CouchDB and forwards the change to the Windows PC, which sends a MIDI message to the reverb pedal on the saxophone's signal. The overlay service turns the event into an on-screen update in OBS, and OBS streams the result back to Twitch.
---

Type `!engine room` in chat and the reverb on my saxophone changes, live, a
second later - and the overlay on the stream shows who did it.

 What's that, set 'Time' to 9? Sure why not -> the chat bot queues a task that shifts my physical pedal's midi values in real time. An over-engineered microservice architecture that puts the viewer on stage, messing with my equipment. Fab!
