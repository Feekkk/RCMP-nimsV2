import { createFileRoute } from '@tanstack/react-router';
import { SESSION_REVOKED_CODE, SESSION_TIMEOUT_CODE } from '@shared/lib/session-policy';

export const Route = createFileRoute('/api/auth/session/ping')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { evaluateWebSession } = await import('@backend/server/auth/session.server');
        const params = new URL(request.url).searchParams;
        const stay = params.get('stay') === '1';
        const activity = params.get('activity') === '1';
        const result = await evaluateWebSession(stay ? 'force' : activity ? 'touch' : 'read');
        if (result.kind === 'ok') {
          return Response.json(
            {
              ok: true,
              issuedAt: result.issuedAt,
              lastActivityAt: result.lastActivityAt,
              serverNow: Date.now(),
              idleTimeoutMs: result.policy.idleTimeoutMs,
              absoluteTimeoutMs: result.policy.absoluteTimeoutMs,
              warningLeadMs: result.policy.warningLeadMs,
            },
            { headers: { 'cache-control': 'no-store' } },
          );
        }
        if (result.kind === 'anonymous') {
          return Response.json(
            { ok: false, reason: 'anonymous' },
            { status: 401, headers: { 'cache-control': 'no-store' } },
          );
        }
        const reason = result.kind === 'timeout' ? 'timeout' : 'revoked';
        return Response.json(
          { ok: false, reason, code: reason === 'timeout' ? SESSION_TIMEOUT_CODE : SESSION_REVOKED_CODE },
          { status: 401, headers: { 'cache-control': 'no-store' } },
        );
      },
    },
  },
});
