
import type {
  DockerStrategy,
} from '../dockerfile-strategy.types.js';

import {
  hasFile,
  nginxArtifacts,
  npmInstall,
} from '../dockerfile-strategy.shared.js';

export const angularStrategy: DockerStrategy = {
  id: 'ANGULAR',

  verify() {
    if (!this.id || !this.generate || !this.matches) {
      throw new Error('Invalid Angular strategy');
    }
  },

  matches(context) {
    return (
      hasFile(context.files, context.root, 'angular.json') &&
      hasFile(context.files, context.root, 'package.json')
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
      'RUN set -eu; mkdir -p /site; ' +
        'find /app/dist -type f -name index.html ' +
        '-print > /tmp/index-files; ' +
        'test "$(wc -l < /tmp/index-files)" -eq 1; ' +
        'page="$(cat /tmp/index-files)"; ' +
        'cp -a "$(dirname "$page")/." /site/',
      '',
      'FROM nginx:1.27-alpine',
      'COPY --from=build /site /usr/share/nginx/html',
      'COPY nginx.conf /etc/nginx/conf.d/default.conf',
      'EXPOSE 80',
      'CMD ["nginx", "-g", "daemon off;"]',
      '',
    ].join('\n');

    return {
      content,
      files: nginxArtifacts(context.root),
      warnings: [
        'Only Angular client-side builds are supported by this template.',
        'Angular SSR requires a separate Node runtime strategy.',
        'Review angular.json outputPath and routing configuration.',
        'The build fails if multiple index.html files are detected.',
        'Docker build has not been executed.',
      ],
    };
  },
};
