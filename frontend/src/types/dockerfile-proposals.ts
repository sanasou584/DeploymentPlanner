
export interface DockerfileProposal {
  componentName: string;
  rootPath: string;
  path: string;
  strategy: 'NEXTJS' | 'NODE';
  content: string;
  dockerignore: string;
  warnings: string[];
}

export interface DockerfileCandidate {
  componentName: string;
  rootPath: string;
  path: string;
  status: 'EXISTS' | 'UNSUPPORTED' | 'GENERATABLE';
  reason: string;
  proposal?: DockerfileProposal;
}

export interface GeneratedDockerfile {
  id: string;
  kind: 'DOCKERFILE';
  componentName: string;
  fileName: string;
  path: string;
  content: string;
  validation: {
    status: 'PENDING' | 'VALID' | 'INVALID';
    issues: string[];
  };
}

export interface DockerfileInspectionResponse {
  message: string;
  data: {
    candidates: DockerfileCandidate[];
    generated: GeneratedDockerfile[];
  };
}

export interface DockerfileGenerationResponse {
  message: string;
  data: GeneratedDockerfile[];
}
