import { Schema } from 'mongoose';

import {
  PROJECT_REPOSITORY_PROVIDERS,
  type RepositoryProvider,
} from '../../domain/enums/project.enums.js';
import {
  buildGitHubUrl,
  isValidGitHubOwner,
  isValidGitHubRepoName,
} from '../../domain/value-objects/repository-url.js';

export interface RepositoryRefFields {
  provider: RepositoryProvider;
  owner: string;
  name: string;
  branch: string;
  defaultBranch?: string;
  isValid: boolean;
  lastVerifiedAt?: Date;
  lastVerificationError?: string;
}

export type RepositoryRefSchemaType = Schema<RepositoryRefFields, unknown, object>;

interface ValidatorProps {
  value: string;
  path: string;
}

export const repositoryRefSchema: RepositoryRefSchemaType = new Schema<
  RepositoryRefFields,
  unknown,
  object
>(
  {
    provider: {
      type: String,
      required: true,
      enum: PROJECT_REPOSITORY_PROVIDERS,
      default: 'github',
    },
    owner: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: isValidGitHubOwner,
        message: (p: ValidatorProps) => `Invalid GitHub owner: "${p.value}"`,
      },
    },
    name: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: isValidGitHubRepoName,
        message: (p: ValidatorProps) => `Invalid GitHub repository name: "${p.value}"`,
      },
    },
    branch: { type: String, required: true, trim: true, minlength: 1 },
    defaultBranch: { type: String, trim: true },
    isValid: { type: Boolean, required: true, default: false },
    lastVerifiedAt: { type: Date },
    lastVerificationError: { type: String },
  },
  { _id: false, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

repositoryRefSchema.virtual('url').get(function repositoryUrlVirtual(
  this: RepositoryRefFields,
): string {
  return buildGitHubUrl(this.owner, this.name);
});
