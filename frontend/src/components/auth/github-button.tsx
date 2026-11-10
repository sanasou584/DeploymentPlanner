import { GITHUB_BUTTON } from "@/data/auth-github";
import { buttonClass } from "@/shared/button";
import { GitHubIcon } from "@/shared/icons/github-icon";

/**
 * Server leaf: the OAuth start is a full browser navigation to the backend
 * (the backend then redirects to GitHub), so the button is a plain anchor.
 * The base URL env has the same fallback as hooks/use-auth-request.
 */
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

export function GithubButton() {
  return (
    <a
      href={`${API_BASE_URL}${GITHUB_BUTTON.path}`}
      className={buttonClass("teal", "h-12 w-full gap-3 text-sm")}
    >
      <GitHubIcon className="h-4 w-4 shrink-0 fill-current text-foam" />
      <span>{GITHUB_BUTTON.label}</span>
    </a>
  );
}
