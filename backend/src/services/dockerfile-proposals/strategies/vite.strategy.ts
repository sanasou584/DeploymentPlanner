
import type {
  DockerStrategy,
} from '../dockerfile-strategy.types.js';

import {
  hasAnyFile,
  hasFile,
  nginxArtifacts,
  npmInstall,
} from '../dockerfile-strategy.shared.js';

export const viteStrategy: DockerStrategy = {
  id: 'VITE',

  verify() {
    if (!this.id || !this.generate || !this.matches) {
      throw new Error('Invalid Vite strategy');
    }
  },

  matches(context) {
    return (
      hasFile(context.files, context.root, 'package.json') &&
      hasAnyFile(context.files, context.root, [
        'vite.config.ts',
        'vite.config.js',
        'vite.config.mts',
        'vite.config.mjs',
      ])
    );
  },

  generate(context) {
    const content = [
      'FROM node:22-bookworm-slim AS build',
      'WORKDIR /app',
      'COPY package*.json ./',
      npmInstall(context.files, context.root),
      'COPY . .',
      'RUN npm run build',
      '',
      'FROM nginx:1.27-alpine',
      'COPY --from=build /app/dist /usr/share/nginx/html',
      'COPY nginx.conf /etc/nginx/conf.d/default.conf',
      'EXPOSE 80',
      'CMD ["nginx", "-g", "daemon off;"]',
      '',
    ].join('\n');

    return {
      content,
      files: nginxArtifacts(context.root),
      warnings: [
        'Verify that npm run build writes static files to dist.',
        'Review Vite environment variables and browser API URLs.',
        'This strategy is for client-side Vite applications, not SSR.',
        'Docker build has not been executed.',
      ],
    };
  },
};
