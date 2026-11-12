
export interface DockerArtifact {
  path: string;
  content: string;
}

export interface DockerStrategyContext {
  root: string;
  files: ReadonlySet<string>;
  componentType: string;
}

export interface DockerStrategyResult {
  content: string;
  files: DockerArtifact[];
  warnings: string[];
}

export interface DockerStrategy {
  id: string;
  verify(): void;
  matches(context: DockerStrategyContext): boolean;
  generate(context: DockerStrategyContext): DockerStrategyResult;
}
