# Arkitekturbeslut

Besluten bevaras på sina etablerade sökvägar. Läs relevant ADR inför ändringar av plattform, ekonomiska regler, UI-gränser eller leveransflöde. [Arkitekturen](../architecture.md) beskriver implementationen; [dokumentationsindexet](../README.md) leder till ämnesguiderna.

- [0001: Neon, Better Auth och PGlite](0001-data-and-auth-platform.md) – data- och authplattform samt offline-/testdatabas.
- [0002: Databasmedvetna releaser](0002-database-aware-releases.md) – gemensam staging och migration före promotion.
- [0003: Appversion och GitHub Releases](0003-app-versioning-and-github-releases.md) – SemVer i appen och CI-publicering efter deploy.
- [0004: Giltighetsdatum och registrerade överföringar](0004-effective-dates-and-confirmed-transfers.md) – datumstyrda versioner, manuella överföringar och kompatibilitetsgräns.
- [0005: Låst utgiftstyp](0005-locked-expense-types.md) – typ väljs vid skapande; annan typ kräver avslut och separat post.
- [0006: Privat UI-paket](0006-private-ui-workspace-package.md) – gemensam presentation i samma repo, med domän, auth och dataåtkomst kvar i appen.
