
import { ConflictError } from '../../domain/errors/index.js';

import type {
  DockerStrategy,
  DockerStrategyContext,
} from './dockerfile-strategy.types.js';

import {
  viteStrategy,
} from './strategies/vite.strategy.js';

import {
  angularStrategy,
} from './strategies/angular.strategy.js';

import {
  springBootStrategy,
} from './strategies/spring-boot.strategy.js';

import {
  dotnetStrategy,
} from './strategies/dotnet.strategy.js';

export function createDockerStrategyRegistry() {
  const strategies: DockerStrategy[] = [];

  function register(strategy: DockerStrategy): void {
    if (
      strategies.some((item) => item.id === strategy.id)
    ) {
      throw new ConflictError(
        `Duplicate Dockerfile strategy: ${strategy.id}`,
      );
    }

    strategy.verify();
    strategies.push(strategy);
  }

  function resolve(
    context: DockerStrategyContext,
  ): DockerStrategy | undefined {
    const matches = strategies.filter((strategy) =>
      strategy.matches(context),
    );

    if (matches.length > 1) {
      throw new ConflictError(
        'Ambiguous Dockerfile strategy: multiple technologies match',
      );
    }

    return matches[0];
  }

  return {
    register,
    resolve,
  };
}

export function createDefaultDockerStrategyRegistry() {
  const registry = createDockerStrategyRegistry();

  registry.register(angularStrategy);
  registry.register(viteStrategy);
  registry.register(springBootStrategy);
  registry.register(dotnetStrategy);

  return registry;
}
