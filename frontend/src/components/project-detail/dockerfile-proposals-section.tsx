
'use client';

import { useState } from 'react';

import { Button } from '@/shared/button';

import {
  useGenerateDockerfileProposalsMutation,
  useInspectDockerfileProposalsQuery,
} from '@/store/dockerfile-proposals-api';

import type {
  DockerfileCandidate,
} from '@/types/dockerfile-proposals';

interface Props {
  projectId: string;
  analysisId: string;
}

function download(
  name: string,
  content: string,
): void {
  const blob = new Blob([content], {
    type: 'text/plain;charset=utf-8',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = name;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function messageOf(error: unknown): string {
  const response = error as {
    data?: {
      error?: {
        message?: string;
      };
    };
    message?: string;
  } | null;

  return (
    response?.data?.error?.message ??
    response?.message ??
    'Dockerfile generation failed'
  );
}

function CandidateCard({
  candidate,
  persisted,
  busy,
  onGenerate,
}: {
  candidate: DockerfileCandidate;
  persisted: boolean;
  busy: boolean;
  onGenerate: (name: string) => void;
}) {
  const proposal = candidate.proposal;

  return (
    <article className="rounded-xl border border-steel/50 bg-basin p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="font-display text-body-md font-semibold text-foam">
            {candidate.componentName}
          </h4>

          <p className="mt-1 break-all font-mono text-label-sm text-mist">
            {candidate.path}
          </p>
        </div>

        <span className="rounded-full border border-steel px-3 py-1 font-mono text-label-sm text-mist">
          {persisted ? 'PROPOSED' : candidate.status}
        </span>
      </div>

      <p className="mt-3 font-display text-body-sm text-mist">
        {candidate.reason}
      </p>

      {proposal ? (
        <>
          <p className="mt-3 font-mono text-label-sm text-ice">
            Template: {proposal.strategy}
          </p>

          <pre className="mt-3 max-h-72 overflow-auto rounded-lg border border-steel/40 bg-abyss p-4 font-mono text-code-md text-ice">
            <code>{proposal.content}</code>
          </pre>
                    <div className="mt-4 rounded-lg border border-steel/40 bg-panel p-3">
            <p className="font-display text-body-sm font-semibold text-foam">
              Generated files
            </p>

            <div className="mt-3 space-y-3">
              {proposal.files.map((file) => (
                <div
                  key={file.path}
                  className="rounded-lg border border-steel/40 bg-basin p-3"
                >
                  <p className="break-all font-mono text-code-md text-ice">
                    {file.path}
                  </p>

                  <Button
                    variant="teal"
                    onClick={() =>
                      download(
                        file.path.split("/").at(-1) ?? "file",
                        file.content,
                      )
                    }
                  >
                    Download file
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="teal"
              onClick={() =>
                download('Dockerfile', proposal.content)
              }
            >
              Download Dockerfile
            </Button>

            <Button
              variant="teal"
              onClick={() =>
                download('.dockerignore', proposal.dockerignore)
              }
            >
              Download .dockerignore
            </Button>

            <Button
              disabled={busy || persisted}
              onClick={() =>
                onGenerate(candidate.componentName)
              }
            >
              {persisted
                ? 'Saved proposal'
                : busy
                  ? 'Saving...'
                  : 'Save proposal'}
            </Button>
          </div>

          {proposal.warnings.length > 0 ? (
            <ul className="mt-3 list-disc space-y-1 pl-5 font-display text-body-sm text-champagne">
              {proposal.warnings.map((warning) => (
                <li key={warning}>
                  {warning}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </article>
  );
}

export function DockerfileProposalsSection({
  projectId,
  analysisId,
}: Props) {
  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useInspectDockerfileProposalsQuery({
    projectId,
    analysisId,
  });

  const [generate, generateState] =
    useGenerateDockerfileProposalsMutation();

  const [feedback, setFeedback] =
    useState<string | null>(null);

  const candidates = data?.data.candidates ?? [];
  const saved = data?.data.generated ?? [];

  async function handleGenerate(name: string) {
    setFeedback(null);

    try {
      await generate({
        projectId,
        analysisId,
        componentNames: [name],
      }).unwrap();

      setFeedback(
        `Dockerfile proposal saved for ${name}. Build verification is still required.`,
      );
    } catch (error) {
      setFeedback(messageOf(error));
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-steel bg-panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-headline-sm font-semibold text-foam">
            Dockerfile proposals — US 7.3
          </h3>

          <p className="mt-2 font-display text-body-sm text-mist">
            Generate templates when the repository
            analysis found no Dockerfile. Review and
            build before deployment.
          </p>
        </div>

        <Button
          variant="teal"
          disabled={isLoading}
          onClick={() => void refetch()}
        >
          Refresh
        </Button>
      </div>

      {feedback ? (
        <p
          role="status"
          className="rounded-lg border border-steel bg-basin p-3 text-body-sm text-foam"
        >
          {feedback}
        </p>
      ) : null}

      {isLoading ? (
        <p className="text-body-sm text-mist">
          Inspecting repository analysis...
        </p>
      ) : null}

      {isError ? (
        <p
          role="alert"
          className="text-body-sm text-crimson"
        >
          Cannot load Dockerfile proposals.
        </p>
      ) : null}

      {candidates.map((candidate) => (
        <CandidateCard
          key={`${candidate.componentName}:${candidate.path}`}
          candidate={candidate}
          persisted={saved.some(
            (file) => file.path === candidate.path
          )}
          busy={generateState.isLoading}
          onGenerate={(name) =>
            void handleGenerate(name)
          }
        />
      ))}

      {saved.length > 0 ? (
        <div className="rounded-lg border border-steel/40 bg-basin p-4">
          <h4 className="font-display text-body-md font-semibold text-foam">
            Saved Dockerfile proposals
          </h4>

          <div className="mt-3 flex flex-col gap-2">
            {saved.map((file) => (
              <div
                key={file.id}
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <span className="break-all font-mono text-code-md text-mist">
                  {file.path} ({file.validation.status})
                </span>

                <Button
                  variant="teal"
                  onClick={() =>
                    download(file.fileName, file.content)
                  }
                >
                  Download
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
