# repositories/

The ONLY layer allowed to run Mongoose queries. Return rich domain documents
(the typed Mongoose documents), never DTOs. Every method accepts
`{ session?, withDeleted? }` so services can compose transactions later.

Dependency rule: `repositories -> models + domain + shared`.
repositories must NEVER import services, controllers or routes.
