import { randomUUID } from 'node:crypto';
import { recordProviderResult } from './status.js';

export interface TraceReceipt { status: 'recorded' | 'failed' | 'not_configured'; id?: string }
export async function traceReview(input: { sessionId: string; model: string; prompt: unknown; output: string; latencyMs: number }, fetcher: typeof fetch = fetch): Promise<TraceReceipt> {
  const key = process.env.PRISM_TRACE_KEY || process.env.PRISMTRACE_API_KEY;
  const project = process.env.PRISM_PROJECT_ID || process.env.PRISMTRACE_PROJECT_ID;
  if (!key || !project) return { status: 'not_configured' };
  const traceId = randomUUID();
  try {
    // This runs inside the background reviewer, not the interactive HTTP handler.
    // Only the synthetic review payload is traced; credentials never enter messages.
    const response = await fetcher('https://prism.blockconvey.com/api/traces', {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000),
      headers: { 'Content-Type': 'application/json', 'X-PRISMtrace-Key': key },
      body: JSON.stringify({ project_id: project, trace_id: traceId, session_id: input.sessionId,
        agent_id: 'second-look-reviewer', model: input.model, latency_ms: Math.round(input.latencyMs),
        input_messages: [{ role: 'user', content: JSON.stringify(input.prompt) }], output_message: input.output }),
    });
    if (!response.ok) throw new Error('Trace rejected.');
    const body = await response.json();
    if (typeof body.id !== 'string') throw new Error('Trace receipt missing.');
    recordProviderResult('prism', true, 'The real Nicrron review was recorded in PRISM; tracing does not verify the financial conclusion.');
    return { status: 'recorded', id: body.id };
  } catch {
    recordProviderResult('prism', false, 'PRISM trace was not confirmed. The proposed question remains available; sponsor tracing is incomplete.');
    return { status: 'failed' };
  }
}
