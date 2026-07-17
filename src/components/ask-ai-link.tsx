import { Link } from '@tanstack/react-router';

type AskAiLinkProps = {
  to: '/admin/prompt' | '/technician/prompt';
};

export function AskAiLink({ to }: AskAiLinkProps) {
  return (
    <Link
      to={to}
      className="group rounded-[8px] px-2.5 py-1.5 text-sm font-semibold transition-colors hover:bg-lavender/10"
    >
      <span className="ask-ai-link-text text-lavender">Ask AI</span>
    </Link>
  );
}
