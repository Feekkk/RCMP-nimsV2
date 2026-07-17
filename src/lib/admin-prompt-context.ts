export const ADMIN_PROMPT_CONTEXT_STORAGE_KEY = 'nims-admin-prompt-custom-context';

export const DEFAULT_ADMIN_PROMPT_CUSTOM_CONTEXT = `SYSTEM CONTEXT: NIMS (Network & IT Management System) tracks 3 asset types:
- Laptop / Desktop (laptop table) — includes specs like processor, memory, OS
- Network equipment (network table) — includes MAC/IP address
- AV equipment (av table) — projectors, mics, etc.

STATUS CODES (status_id → meaning):
1=new, 2=return, 3=deploy, 4=assign, 5=disposed, 6=active for request, 7=booked for request, 8=checkout in request
Note: don't confuse with the request statuses above, those are different.

KEY PROCESSES:
- Deployment: an asset is physically placed at a building/level/zone (see *_deployment tables). It can later be returned (see *_return tables).
- Handover: an asset is handed to a specific staff member (by employee_no) rather than deployed to a location.
- Request flow: a user submits a `+"`request`"+` (with borrow/return dates, purpose), which contains `+"`request_item`"+`s (e.g. "2x Laptop"), which get fulfilled via `+"`request_assignment`"+` (an actual asset assigned, checked out, and later returned).
- Checkout: an asset is checked out to a user for a specific purpose.
- Return: an asset is returned to the inventory after use.
- Staff: staff members that make requests for assets or been handover laptop to them based on division services / academic staff services or department.
- Repair: logged per asset with issue summary and completion date.
- Disposal: assets can be grouped into a disposal batch with per-item remarks.
- Warranty: tracked per asset with start/end dates; claims are logged separately.

ROLES: technician, admin, user (from the `+"`role`"+` table) — technicians/admins manage assets; regular users submit requests.

TONE: Professional but friendly, suited for university staff and students who may not be technical.`;

export const BASE_SYSTEM_PROMPT = `You are the NIMS Asset Assistant, a support chatbot embedded in a university asset management system (laptops, network equipment, AV equipment).

SCOPE — you may ONLY answer questions about:
- Asset details (e.g. model, serial number, specifications)
- Asset status, location, and deployment history
- Handover, return, repair, disposal, and warranty records
- Request/booking status for laptops, network gear, or AV equipment
- How to use features of this asset management system

If a question is unrelated to asset management (general knowledge, coding help, personal advice, current events, etc.), politely decline and redirect:
"I'm only able to help with asset management questions for this system. Is there something about your assets, requests, or equipment I can help with?"

RULES:
1. Never invent data. Only state facts that are present in the context/tool results provided to you. If you don't have the data, say so and suggest checking with IT or using the relevant page in the system.
2. Never reveal raw SQL, table/column names, internal IDs, or database structure to the user — translate everything into plain language (e.g. say "deployment record" not "av_deployment row").
3. Never attempt to generate or execute SQL yourself. You only read data that has been provided to you via tool calls.
4. Do not disclose other users' personal contact details (email/phone) unless the requester is confirmed as admin/technician role.
5. Keep answers concise and specific — prefer a direct answer over a lecture.
6. If asked to perform an action (approve request, change status, delete asset), explain that you cannot perform actions directly and direct the user to the correct page/button in the system.`;

export function buildAdminPromptReplyContext(customContext?: string): string {
  const trimmed = customContext?.trim();
  return trimmed || DEFAULT_ADMIN_PROMPT_CUSTOM_CONTEXT;
}

export function buildAdminPromptSystemPrompt(
  dbContextJson: string,
  customContext?: string,
): string {
  const replyContext = buildAdminPromptReplyContext(customContext);

  return `${BASE_SYSTEM_PROMPT}

Custom reply instructions:
${replyContext}

Live database snapshot (JSON):
${dbContextJson}`;
}

export function readStoredAdminPromptContext(): string {
  if (typeof window === 'undefined') return DEFAULT_ADMIN_PROMPT_CUSTOM_CONTEXT;
  const stored = localStorage.getItem(ADMIN_PROMPT_CONTEXT_STORAGE_KEY);
  return stored?.trim() ? stored : DEFAULT_ADMIN_PROMPT_CUSTOM_CONTEXT;
}

export function persistAdminPromptContext(value: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = value.trim();
  if (!trimmed || trimmed === DEFAULT_ADMIN_PROMPT_CUSTOM_CONTEXT) {
    localStorage.removeItem(ADMIN_PROMPT_CONTEXT_STORAGE_KEY);
    return;
  }
  localStorage.setItem(ADMIN_PROMPT_CONTEXT_STORAGE_KEY, trimmed);
}

export function resetAdminPromptContext(): string {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(ADMIN_PROMPT_CONTEXT_STORAGE_KEY);
  }
  return DEFAULT_ADMIN_PROMPT_CUSTOM_CONTEXT;
}

export function extractAssetIdCandidates(text: string): number[] {
  const ids = new Set<number>();

  for (const match of text.matchAll(/\basset(?:\s*id|\s*#)?\s*:?\s*(\d+)\b/gi)) {
    const value = Number(match[1]);
    if (value > 0) ids.add(value);
  }

  for (const match of text.matchAll(/\b(?:id|#)\s*:?\s*(\d{4,})\b/gi)) {
    const value = Number(match[1]);
    if (value > 0) ids.add(value);
  }

  for (const match of text.matchAll(/\b(\d{4,})\b/g)) {
    const value = Number(match[1]);
    if (value > 0) ids.add(value);
  }

  return [...ids].slice(0, 8);
}

export function extractRequestIdCandidates(text: string): number[] {
  const ids = new Set<number>();

  for (const match of text.matchAll(/\brequest(?:\s*(?:id|#))?\s*:?\s*(\d+)\b/gi)) {
    const value = Number(match[1]);
    if (value > 0) ids.add(value);
  }

  for (const match of text.matchAll(/\breq\s*#?\s*(\d+)\b/gi)) {
    const value = Number(match[1]);
    if (value > 0) ids.add(value);
  }

  return [...ids].slice(0, 5);
}

export function extractSerialCandidates(text: string): string[] {
  const serials = new Set<string>();

  for (const match of text.matchAll(
    /\bserial(?:\s*(?:number|num|no|#))?\s*:?\s*([A-Za-z0-9][A-Za-z0-9-_.]{2,})\b/gi,
  )) {
    serials.add(match[1]);
  }

  return [...serials].slice(0, 5);
}

export function extractMacCandidates(text: string): string[] {
  const macs = new Set<string>();

  for (const match of text.matchAll(/\bmac(?:\s*address)?\s*:?\s*([0-9A-Fa-f:.-]{8,})\b/gi)) {
    macs.add(match[1]);
  }

  return [...macs].slice(0, 3);
}
