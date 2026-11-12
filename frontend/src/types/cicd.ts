
export interface CicdComponent {
  name: string;
  rootPath: string;
  dockerfilePath: string;
  image: string;
}

export interface CicdPreview {
  workflowPath: string;
  workflow: string;
  components: CicdComponent[];
  files: string[];
  warnings: string[];
}

export interface CicdPullRequest {
  number: number;
  url: string;
  branch: string;
  repository: string;
  files: string[];
}

export interface CicdPreviewResponse {
  message: string;
  data: CicdPreview;
}

export interface CicdPullRequestResponse {
  message: string;
  data: CicdPullRequest;
}
