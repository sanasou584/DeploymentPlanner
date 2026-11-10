# domain/

Pure business logic with ZERO framework dependencies: no mongoose, no express,
no config, no I/O. Everything here is unit-testable without a database.

Contents (added in Phase 2+):

- errors/ - AppError base class and typed domain errors
- state-machine/ - defineStateMachine, reused by every status field
- enums/ - `as const` enum objects + derived union types
- value-objects/ - ResourceSpec, HpaSpec, IngressSpec, RepositoryRef, ErrorInfo,
  Kubernetes quantity parsing

Dependency rule: domain imports NOTHING from the rest of the backend
(the dependency direction always ends in domain/ and shared/).
