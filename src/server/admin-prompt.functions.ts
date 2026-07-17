import { chat } from '@tanstack/ai';
import { createServerFn } from '@tanstack/react-start';
import { buildAdminPromptSystemPrompt } from '@/lib/admin-prompt-context';
import { assertStaffRole } from '@/server/technician-auth.server';
import { getOpenRouterChatAdapter, isOpenRouterConfigured } from '@/lib/openrouter';

type PromptChatRole = 'user' | 'assistant';

type PromptChatTurn = {
  role: PromptChatRole;
  content: string;
};

export const adminPromptChatFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      callerRoleId: number;
      message: string;
      history?: PromptChatTurn[];
      customContext?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    assertStaffRole(data.callerRoleId);

    const message = data.message.trim();
    if (!message) {
      throw new Error('Enter a question before sending.');
    }

    if (!isOpenRouterConfigured()) {
      throw new Error('OpenRouter is not configured. Add OPENROUTER_API_KEY to your .env file.');
    }

    const { getTechnicianDashboard } = await import('@/server/dashboard-repo.server');
    const { getAdminRequestInsights } = await import('@/server/admin-request-insights-repo.server');
    const { buildAdminPromptDbContext } = await import('@/server/admin-prompt-context-repo.server');

    const now = new Date();
    const [dashboard, requestInsights] = await Promise.all([
      getTechnicianDashboard({ year: now.getFullYear(), month: now.getMonth() + 1 }),
      getAdminRequestInsights(),
    ]);

    const dbContext = await buildAdminPromptDbContext(
      dashboard.stats,
      requestInsights,
      [message, ...(data.history ?? []).map((turn) => turn.content)].join('\n'),
    );
    const history = (data.history ?? [])
      .filter((turn) => turn.content.trim())
      .slice(-8)
      .map((turn) => ({
        role: turn.role,
        content: turn.content.trim(),
      }));

    const reply = await chat({
      adapter: getOpenRouterChatAdapter(),
      systemPrompts: [
        buildAdminPromptSystemPrompt(JSON.stringify(dbContext, null, 2), data.customContext),
      ],
      messages: [
        ...history,
        { role: 'user', content: message },
      ],
      stream: false,
    });

    return {
      reply: typeof reply === 'string' ? reply.trim() : String(reply).trim(),
    };
  });
