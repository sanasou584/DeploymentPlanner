
import mongoose, {
  Schema,
  type HydratedDocument,
  type Types,
} from 'mongoose';

export interface AuthIdentityFields {
  userId: Types.ObjectId;
  provider: 'github';
  providerUserId: string;
}

export type AuthIdentityDocument =
  HydratedDocument<AuthIdentityFields>;

const authIdentitySchema =
  new Schema<AuthIdentityFields>(
    {
      userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
      },

      provider: {
        type: String,
        enum: ['github'],
        required: true,
      },

      providerUserId: {
        type: String,
        required: true,
      },
    },
    {
      timestamps: true,
    },
  );

// Une identité GitHub ne peut appartenir
// qu'à un seul utilisateur.
authIdentitySchema.index(
  { provider: 1, providerUserId: 1 },
  { unique: true },
);

export const AuthIdentity = mongoose.model(
  'AuthIdentity',
  authIdentitySchema,
);
