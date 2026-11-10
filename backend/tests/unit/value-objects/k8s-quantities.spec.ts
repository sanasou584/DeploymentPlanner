import { describe, expect, it } from 'vitest';

import {
  InvalidQuantityError,
  parseCpu,
  parseMemory,
} from '../../../src/domain/value-objects/k8s-quantities.js';

describe('parseCpu', () => {
  it('parses millicore form to millicores', () => {
    expect(parseCpu('250m')).toBe(250);
    expect(parseCpu('1000m')).toBe(1000);
    expect(parseCpu('0m')).toBe(0);
  });

  it('parses bare-core forms to millicores', () => {
    expect(parseCpu('0.5')).toBe(500);
    expect(parseCpu('2')).toBe(2000);
    expect(parseCpu('1.25')).toBe(1250);
  });

  it('rejects invalid cpu formats', () => {
    for (const bad of ['', 'm', 'm250', '250M', '.5', '-250m', '1e3', '0,5', '1.2.3']) {
      expect(() => parseCpu(bad)).toThrowError(InvalidQuantityError);
    }
  });
});

describe('parseMemory', () => {
  it('parses binary units to bytes', () => {
    expect(parseMemory('256Mi')).toBe(256 * 1024 ** 2);
    expect(parseMemory('1Gi')).toBe(1024 ** 3);
    expect(parseMemory('10Ki')).toBe(10 * 1024);
    expect(parseMemory('2Ei')).toBe(2 * 1024 ** 6);
  });

  it('parses decimal-SI units to bytes', () => {
    expect(parseMemory('512M')).toBe(512 * 1000 ** 2);
    expect(parseMemory('3G')).toBe(3 * 1000 ** 3);
    expect(parseMemory('5k')).toBe(5000);
  });

  it('parses plain bytes', () => {
    expect(parseMemory('4096')).toBe(4096);
    expect(parseMemory('0')).toBe(0);
  });

  it('accepts fractional amounts', () => {
    expect(parseMemory('1.5Gi')).toBe(Math.round(1.5 * 1024 ** 3));
    expect(parseMemory('0.5Mi')).toBe(Math.round(0.5 * 1024 ** 2));
  });

  it('rejects invalid memory formats', () => {
    for (const bad of ['Mi', '1mi', '1 MB', '1MiB', '-1Gi', '1kk', '1G1']) {
      expect(() => parseMemory(bad)).toThrowError(InvalidQuantityError);
    }
  });
});
