/**
 * GET /api/agent/probe
 *
 * BFF endpoint that streams the next AgenticProbe for the requesting session.
 *
 * Wire shape (one JSON object per `data:` SSE line):
 *   - { probe: AgenticProbe }              // when CalibrationAgent is wired
 *   - { signal: { calibrationProgress } }  // drift / state frames
 *   - { done: true }                       // sentinel before connection close
 *   - { error: "<message>" }               // fatal — client redirects to /setup
 *
 * CalibrationAgent is invoked server-side; malformed output (or LLM
 * unreachability) surfaces as a single { error } frame and a 200 status
 * with the `error` payload — *not* an HTTP 5xx. This is intentional so
 * the SSE consumer picks one frame and closes cleanly without exposing
 * transport-level failure semantics to the player. The client uses the
 * `error` frame to set llmOffline + redirect to /setup.
 */

import type { RequestHandler } from '@sveltejs/kit';
import { getOrCreateAgentRuntime } from '$lib/server/agentRegistry.js';
import { AgenticProbeValidationError } from '../../../../core/agent/validateAgenticProbe.js';

export const GET: RequestHandler = async ({ url }) => {
  const sessionId = url.searchParams.get('session') ?? '';

  const { director } = getOrCreateAgentRuntime();
  void sessionId; // reserved for per-session routing later

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        if (director.snapshot().calibrationComplete) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                signal: {
                  calibrationProgress: 1,
                  calibrationComplete: true,
                  phase: 'done',
                },
              })}\n\n`,
            ),
          );
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          controller.close();
          return;
        }

        const probe = await director.generateCalibrationProbe();
        director.setLatestProbe(probe);
        // The signal weight is staged by `generateCalibrationProbe` itself, from the probe it just
        // built — a caller that forgets it silently scored every response at 0.1, which is a ramp
        // with no ramp. Not repeated here.

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              probe,
              signal: {
                calibrationProgress: director.snapshot().calibrationConfidence,
                calibrationComplete: false,
                phase: 'awaiting-response',
              },
            })}\n\n`,
          ),
        );
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
        controller.close();
      } catch (err) {
        const message =
          err instanceof AgenticProbeValidationError
            ? `[AgenticProbe:${err.code}] ${err.message}`
            : err instanceof Error
              ? err.message
              : String(err);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
};
