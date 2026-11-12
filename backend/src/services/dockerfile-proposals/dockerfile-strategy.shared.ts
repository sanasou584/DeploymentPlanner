
export function pathIn(
  root: string,
  name: string,
): string {
  return root ? `${root}/${name}` : name;
}

export function hasFile(
  files: ReadonlySet<string>,
  root: string,
  name: string,
): boolean {
  return files.has(pathIn(root, name));
}

export function hasAnyFile(
  files: ReadonlySet<string>,
  root: string,
  names: readonly string[],
): boolean {
  return names.some((name) =>
    hasFile(files, root, name),
  );
}

export function npmInstall(
  files: ReadonlySet<string>,
  root: string,
): string {
  return hasFile(files, root, 'package-lock.json')
    ? 'RUN npm ci'
    : 'RUN npm install';
}

export const NGINX_CONFIG = [
  'server {',
  '    listen 80;',
  '    server_name _;',
  '',
  '    root /usr/share/nginx/html;',
  '    index index.html;',
  '',
  '    location / {',
  '        try_files $uri $uri/ /index.html;',
  '    }',
  '}',
  '',
].join('\n');

export const DOCKER_IGNORE = [
  '.git',
  '.gitignore',
  'node_modules',
  '.next',
  'dist',
  'build',
  'coverage',
  '.env',
  '.env.*',
  '!.env.example',
  '*.log',
  '.DS_Store',
  '',
].join('\n');

export function nginxArtifacts(
  root: string,
): Array<{ path: string; content: string }> {
  return [
    {
      path: pathIn(root, 'nginx.conf'),
      content: NGINX_CONFIG,
    },
  ];
}
