# models/plugins/

Cross-model Mongoose schema plugins shared by many models (e.g. soft delete,
base serialization/transform options). Plugins receive a schema and must not
import other layers; they may depend on domain/ helpers only.
