# models/

DES313 - Rich Mongoose models here. models/ = schema plugins (soft delete, base transforms).

Dependency rule: `models -> domain + shared` (+ mongoose).
models must NEVER import repositories, services, controllers, routes or Express.

Rules that live in models: single-document invariants, state machines,
named static factories (User.register, Project.createFor...). Cross-document
rules go to services (documented in docs/domain-model.md).
