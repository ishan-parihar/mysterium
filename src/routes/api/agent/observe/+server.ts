/**
 * POST /api/agent/observe
 *
 * BFF endpoint for the client to forward player actions into the
 * DirectorAgent. Two operation modes are supported via the `op`
 * discriminator:
 *
 *   - op: "free-input"
 *       Body: { sessionId, freeInput: { text, selectedPolarity } }
 *       Effect: appends to Loom, returns current DirectorSnapshot.
 *
 *   - op: "probe-response"
 *       Body: { sessionId, response: { probeId, selectedPolarity, selectedIndex, freeInput } }
 *       Effect: fed to DirectorAgent.observeProbeResponse — advances calibration
 *               confidence and possibly flips calibration_complete.
 *
 * Returns 200 with the updated DirectorSnapshot. The endpoint is honest:
 * a 200 with `status: "fail"` in the body still uses HTTP 200 so the
 * client can render graceful UI; only true transport-level errors use 4xx.
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { getOrCreateAgentRuntime } from '$lib/server/agentRegistry.js';
import { type LoomFreeInput } from '../../../../core/agent/Loom.js';
import { type ProbePolarity, PROBE_POLARITIES } from '../../../../core/agent/AgenticProbe.js';

interface FreeInputBody {
  readonly op?: 'free-input';
  readonly sessionId?: string;
  readonly freeInput?: {
    readonly text?: unknown;
    readonly selectedPolarity?: unknown;
  };
}

interface ProbeResponseBody {
  readonly op?: 'probe-response';
  readonly sessionId?: string;
  readonly response?: {
    readonly probeId?: unknown;
    readonly selectedPolarity?: unknown;
    readonly selectedIndex?: unknown;
    readonly freeInput?: unknown;
  };
}

type Body = FreeInputBody | ProbeResponseBody;

function asText(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

const POLARITY_SET: ReadonlySet<ProbePolarity> = new Set(PROBE_POLARITIES);

export const POST: RequestHandler = async ({ request }) => {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
  if (sessionId.length === 0) {
    return json({ error: 'sessionId is required' }, { status: 400 });
  }

  // Routed by session. The endpoint REQUIRED a sessionId and then did not use it, which meant every
  // browser on this isolate shared one DirectorAgent — see `agentRegistry.ts`.
  const { director } = getOrCreateAgentRuntime(sessionId);

  if (body.op === 'probe-response') {
    if (!body.response) {
      return json({ error: 'response is required for probe-response' }, { status: 400 });
    }
    const r = body.response;
    const probeId = asText(r.probeId);
    const freeText = asText(r.freeInput);
    const polarity = typeof r.selectedPolarity === 'string' ? r.selectedPolarity : '';
    const idx = r.selectedIndex;
    if (!probeId) return json({ error: 'response.probeId required' }, { status: 400 });
    if (!POLARITY_SET.has(polarity as ProbePolarity)) {
      return json({ error: 'response.selectedPolarity invalid' }, { status: 400 });
    }
    if (idx !== 0 && idx !== 1 && idx !== 2 && idx !== 3) {
      return json({ error: 'response.selectedIndex must be 0..3' }, { status: 400 });
    }
    const confidence = await director.observeProbeResponse({
      probeId,
      selectedPolarity: polarity as ProbePolarity,
      selectedIndex: idx as 0 | 1 | 2 | 3,
      freeInput: freeText,
    });
    return json({ ok: true, snapshot: director.snapshot(), calibrationConfidence: confidence });
  }

  // Default: free-input mode. Narrow `body` to FreeInputBody from the union.
  const freeInputBody = body as FreeInputBody;
  if (!freeInputBody.freeInput) {
    return json({ error: 'freeInput required when op is not probe-response' }, { status: 400 });
  }
  const text = asText(freeInputBody.freeInput.text);
  const polarity = asText(freeInputBody.freeInput.selectedPolarity);
  if (text.length === 0) {
    return json({ error: 'freeInput.text is required' }, { status: 400 });
  }
  const input: LoomFreeInput = {
    timestamp: Date.now(),
    text,
    selectedPolarity: polarity,
  };
  director.observeFreeInput(input);
  return json({ ok: true, snapshot: director.snapshot() });
};
