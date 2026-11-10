
import mongoose, {
  Schema,
  type HydratedDocument,
} from 'mongoose';

export interface SessionRevocationFields {
  jti: string;
  expiresAt: Date;
}

export type SessionRevocationDocument =
  HydratedDocument<SessionRevocationFields>;

const sessionRevocationSchema =
  new Schema<SessionRevocationFields>(
    {
      jti: {
        type: String,
        required: true,
      },

      expiresAt: {
        type: Date,
        required: true,
      },
    },
    {
      timestamps: true,
    },
  );

// Le même jeton ne peut être révoqué que sur une seule ligne.
sessionRevocationSchema.index({ jti: 1 }, { unique: true });

// TTL : la ligne d'une révocation s'auto-détruit dès que le jeton
// qu'elle interdit aurait expiré de lui-même.
sessionRevocationSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 },
);

export const SESSION_REVOCATION_MODEL_NAME = 'SessionRevocation';

export const SessionRevocation = mongoose.model(
  SESSION_REVOCATION_MODEL_NAME,
  sessionRevocationSchema,
);
