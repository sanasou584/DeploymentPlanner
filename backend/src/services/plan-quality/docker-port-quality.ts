
import { ConflictError } from '../../domain/errors/index.js';

export interface DockerPortArtifact {
  kind: string;
  componentName: string;
  content: string;
}

export interface PortComponent {
  name: string;
  containerPort: number | null;
  targetPort?: number | string | null;
}

export interface PortEvidence {
  name: string;
  kubernetes?: {
    containerPort: number | null;
  };
}

export function exposedDockerPort(
  content: string,
): number | null {
  const exposed = [
    ...content.matchAll(
      /^\s*EXPOSE\s+(\d{1,5})(?:\/tcp)?\s*$/gim,
    ),
  ];

  const last = exposed.at(-1);

  if (!last?.[1]) {
    return null;
  }

  const port = Number(last[1]);

  return Number.isInteger(port) &&
    port >= 1 &&
    port <= 65535
    ? port
    : null;
}

function dockerfileFor(
  componentName: string,
  files: readonly DockerPortArtifact[],
): DockerPortArtifact | undefined {
  return files.find(
    (file) =>
      file.kind === 'DOCKERFILE' &&
      file.componentName.toLowerCase() ===
        componentName.toLowerCase(),
  );
}

export function alignGeneratedDockerPorts<
  T extends PortComponent,
>(
  components: readonly T[],
  evidence: readonly PortEvidence[],
  files: readonly DockerPortArtifact[],
): {
  components: T[];
  warnings: string[];
} {
  const warnings: string[] = [];

  const aligned = components.map((component) => {
    const detected = evidence.find(
      (item) =>
        item.name.toLowerCase() ===
        component.name.toLowerCase(),
    );

    const recordedPort =
      detected?.kubernetes?.containerPort;

    if (recordedPort != null) {
      return component;
    }

    const dockerfile = dockerfileFor(
      component.name,
      files,
    );

    const port = dockerfile
      ? exposedDockerPort(dockerfile.content)
      : null;

    if (port === null) {
      warnings.push(
        `${component.name}: Docker runtime port could not be verified`,
      );

      return component;
    }

    warnings.push(
      `${component.name}: container port ${port} inferred from generated Dockerfile; verify runtime binding`,
    );

    return {
      ...component,
      containerPort: port,
      targetPort: port,
    };
  });

  return {
    components: aligned,
    warnings,
  };
}

export function assertDockerPortsMatch<
  T extends PortComponent,
>(
  components: readonly T[],
  files: readonly DockerPortArtifact[],
): void {
  for (const component of components) {
    const dockerfile = dockerfileFor(
      component.name,
      files,
    );

    if (!dockerfile) {
      continue;
    }

    const exposed = exposedDockerPort(
      dockerfile.content,
    );

    if (exposed === null) {
      continue;
    }

    if (component.containerPort !== exposed) {
      throw new ConflictError(
        `${component.name}: Deployment Plan containerPort ${component.containerPort} differs from Dockerfile EXPOSE ${exposed}`,
      );
    }

    if (
      typeof component.targetPort === 'number' &&
      component.targetPort !== exposed
    ) {
      throw new ConflictError(
        `${component.name}: Kubernetes targetPort ${component.targetPort} differs from Dockerfile EXPOSE ${exposed}`,
      );
    }
  }
}
