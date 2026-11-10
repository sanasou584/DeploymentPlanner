# shared/

Cross-cutting, framework-free modules usable by every layer above:

- logging/ - pino logger factory (takes its level as an argument so shared/ never reads config)
- crypto/ - AES-256-GCM token encryption/decryption (Phase 2)
- security/ - password hashing behind a tiny interface (Phase 2)

Dependency rule: shared/ may only import domain/ (and Node built-ins).
shared/ must NEVER import models, repositories, services, controllers, routes,
middleware or config.
