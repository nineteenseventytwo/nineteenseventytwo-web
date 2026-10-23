---
title: The nineteenseventytwo platform
summary: Four Raspberry Pis, a PC and an AWS organization, built like production and documented like it.
order: 10
diagram: ./platform.svg
diagramAlt: Cloudflare and GitHub at the top. Below them the home lab on VLAN 20 - a console Pi that builds the cluster, a three-node Raspberry Pi Kubernetes cluster running Argo CD, Vault, Longhorn, Prometheus and Grafana, cert-manager, GitHub runners and two apps, and a dual-boot PC for streaming and GPU inference. Pods sign in to an AWS organization of five accounts with short-lived credentials; this website is served from the platform-prod account.
---

The question it answers is **how do I rebuild everything from nothing?** Every
node, every cluster component and every app is defined in git; a fifth Pi
outside the cluster builds it, and Argo CD keeps it matching `main` after that.

- **The cluster** is kubeadm on three Raspberry Pi 5s with 2 GB each, which
  keeps every resource decision honest. Cilium for networking and default-deny
  policy, Longhorn for storage, Vault for secrets, Prometheus and Grafana
  watching it all and posting to Slack.
- **The PC** dual-boots: Windows runs the streaming side of 8 Bit Sax Lounge,
  Linux runs GPU inference for the composer.
- **AWS** is an organization of five accounts with guardrails, central audit
  logs and threat detection. Pods reach it without a single stored key: the
  cluster's own identity is trusted by AWS, and each workload gets an hour of
  access to exactly one role.
- **This site** is static files in S3 behind CloudFront, deployed on merge.

Every significant choice is written down as a decision record, along with what
it protects against.
