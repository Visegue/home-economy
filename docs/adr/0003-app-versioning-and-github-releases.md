---
status: accepted
date: 2026-09-17
---

# Appversion i package.json, release efter deploy

## Beslut

Repot innehåller en webbapp men kan senare få native-appar och delade paket. `package.json.version` är appens enda SemVer 2.0.0-källa.

En obligatorisk PR-kontroll kräver högre version än `main` för app- och releaseändringar och kommenterar blockerade PR:er. Rena dokumentations-, testfil- och CI-ändringar undantas.

Efter lyckad produktionspromotion skapar CI `v<version>` på deployad commit och publicerar GitHub Release. Taggar får inte skapas eller flyttas manuellt.

## Alternativ

- **Changesets eller annan releasehanterare:** användbart för paket med egna versioner, men onödig administration för en app. Ompröva om repot blir ett monorepo med flera produkter.
- **Manuella versioner och taggar:** enklare automation, men lätt att missa en höjning eller tagga innan deploy lyckats.

## Följder

- Agenter och bidragsgivare väljer patch, minor eller major medvetet och motiverar i PR:en. Höj igen om `main` hinner ikapp. Enbart byggmetadata höjer inte SemVer-ordningen.
- Prerelease på `main` deployas också till produktion; bara GitHub-etiketten skiljer sig.
- Misslyckad GitHub Release kan lämna nya versionen i produktion. Följ [release-runbooken](../release-runbook.md) utan att flytta befintliga taggar.
