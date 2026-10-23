---
title: The nineteenseventytwo platform
summary: A pile of Raspberry PIs, my PC, a cloud account, and a dream. The platform hosts all my workloads and this very website on a shoestring budget and never enough RAM.
order: 10
diagram: ./platform.svg
diagramAlt: Cloudflare and GitHub at the top. Below them the home lab on VLAN 20 - a console Pi that builds the cluster, a three-node Raspberry Pi Kubernetes cluster running Argo CD, Vault, Longhorn, Prometheus and Grafana, cert-manager, GitHub runners and two apps, and a dual-boot PC for streaming and GPU inference. Pods sign in to an AWS organization of five accounts with short-lived credentials; this website is served from the platform-prod account.
---

In my culture we expect to have to pick up and start again at any moment, all resources are created in this way where rebuilding from nothing is expected and swift. Essential data is few and far between, but if it is so it is in a safe cubby somewhere ready to load into a fresh platform instance. The zen of DevOps is alive and well here, all platform changes runs through CI/CD deployment is GitOps driven as standard.

- **The cluster** full k8s via kubeadm on three Raspberry Pi 5s with 2 GB each, security through ufw rules and CNI network policies, ESO for all secrets, Longhorn for storage, Vault for secrets, Prometheus and Grafana watching it all and posting to Slack - yeah, OOM juggling is my kink
- **The PC** dual-boots: Windows runs the streaming side of 8 Bit Sax Lounge and connects to midi effects pedals, Linux runs GPU inference AI tasks for the composer and friends.
- **AWS** is an organization of five accounts with guardrails, central audit
  logs and threat detection. Pods reach it without a single stored key: the
  cluster's own identity is trusted by AWS, and each workload gets time limited
  access to exactly one role.
- **This site** is static files in S3 behind CloudFront, deployed on merge.
