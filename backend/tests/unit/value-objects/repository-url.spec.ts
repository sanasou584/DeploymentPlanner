import { describe, expect, it } from 'vitest';

import {
  buildGitHubUrl,
  isValidGitHubOwner,
  isValidGitHubRepoName,
  isValidHostname,
  parseGitHubUrl,
} from '../../../src/domain/value-objects/repository-url.js';

describe('parseGitHubUrl', () => {
  it('accepts plain HTTPS URLs', () => {
    expect(parseGitHubUrl('https://github.com/acme/widgets')).toEqual({
      owner: 'acme',
      name: 'widgets',
    });
  });

  it('accepts https URLs with trailing slash or .git suffix', () => {
    expect(parseGitHubUrl('https://github.com/acme/widgets.git')).toEqual({
      owner: 'acme',
      name: 'widgets',
    });
    expect(parseGitHubUrl('https://github.com/acme/widgets/')).toEqual({
      owner: 'acme',
      name: 'widgets',
    });
    expect(parseGitHubUrl('https://github.com/acme/widgets.git/')).toEqual({
      owner: 'acme',
      name: 'widgets',
    });
  });

  it('accepts optional www prefix', () => {
    expect(parseGitHubUrl('https://www.github.com/acme/widgets.git')).toEqual({
      owner: 'acme',
      name: 'widgets',
    });
  });

  it('rejects everything that is not the HTTPS GitHub form', () => {
    const badUrls = [
      'http://github.com/acme/widgets',
      'git@github.com:acme/widgets.git',
      'ssh://git@github.com/acme/widgets',
      'https://gitlab.com/acme/widgets',
      'https://github.com/acme',
      'https://github.com/acme/',
      'https://github.com/acme/widgets/tree/main/sub',
      'github.com/acme/widgets',
      'HTTPS://github.com/acme/widgets',
      'https://github.com//widgets',
      'https://github.com/acme/.',
      'https://github.com/acme/..',
      'https://github.com/acme/widgets.git/extra',
    ];

    for (const url of badUrls) {
      expect(() => parseGitHubUrl(url)).toThrowError(/Invalid GitHub repository URL/);
    }
  });
});

describe('name validators', () => {
  it('validates GitHub owners', () => {
    expect(isValidGitHubOwner('acme-corp')).toBe(true);
    expect(isValidGitHubOwner('a')).toBe(true);
    expect(isValidGitHubOwner('-acme')).toBe(false);
    expect(isValidGitHubOwner('acme-')).toBe(false);
    expect(isValidGitHubOwner('ac me')).toBe(false);
    expect(isValidGitHubOwner('a'.repeat(40))).toBe(false);
  });

  it('validates GitHub repo names', () => {
    expect(isValidGitHubRepoName('my-repo.holder')).toBe(true);
    expect(isValidGitHubRepoName('.hidden')).toBe(false);
    expect(isValidGitHubRepoName('..')).toBe(false);
    expect(isValidGitHubRepoName('my repo')).toBe(false);
  });

  it('builds canonical urls', () => {
    expect(buildGitHubUrl('acme', 'widgets')).toBe('https://github.com/acme/widgets');
  });
});

describe('isValidHostname', () => {
  it('accepts valid hostnames', () => {
    for (const host of ['example.com', 'a.b.c.d', 'api-ingress.prox.example', 'xn--80c', '12345']) {
      expect(isValidHostname(host)).toBe(true);
    }
  });

  it('rejects invalid hostnames', () => {
    for (const host of [
      '',
      '.example.com',
      'example.com.',
      '-bad.example',
      'bad-.example',
      'exa mple.com',
      'exa_mple.com',
      '*.example.com',
      `${'a'.repeat(64)}.com`,
    ]) {
      expect(isValidHostname(host)).toBe(false);
    }
  });
});
