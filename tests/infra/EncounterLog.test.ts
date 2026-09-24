/**
 * The encounter log's label/value contract (F7).
 *
 * F7 put the player's words and the question on the `ConsequenceRecord`; this file locks the
 * surface those fields are rendered onto. The contract is **one labelled line per field**, because
 * the log is read back by `scripts/cli/support.ts`'s `extractLastNarrativeAsFocus` and by anyone
 * scanning it for what was asked. A value carrying its own newlines renders as `**Question:**`
 * followed by a blank line and the text — the label detached from its content, which is what the
 * live smoke caught before the collapse was added.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { extractLastNarrativeAsFocus } from '../../scripts/cli/support.js';

const ORIGINAL_HOME = process.env.HOME;
const ORIGINAL_MYSTERIUM_HOME = process.env.MYSTERIUM_HOME;
let tempHome: string;
let profileDir: string;

beforeEach(() => {
  tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'mysterium-log-'));
  process.env.HOME = tempHome;
  process.env.MYSTERIUM_HOME = tempHome;
  profileDir = path.join(tempHome, 'profiles', 'default');
  fs.mkdirSync(profileDir, { recursive: true });
  vi.resetModules();
});

afterEach(() => {
  process.env.HOME = ORIGINAL_HOME;
  if (ORIGINAL_MYSTERIUM_HOME === undefined) delete process.env.MYSTERIUM_HOME;
  else process.env.MYSTERIUM_HOME = ORIGINAL_MYSTERIUM_HOME;
  try { fs.rmSync(tempHome, { recursive: true, force: true }); } catch { /* best-effort */ }
});

async function append(entry: Parameters<
  Awaited<typeof import('../../src/infra/profiles/ProfileManager.js')>['appendEncounterLog']
>[1]): Promise<string> {
  const { appendEncounterLog } = await import('../../src/infra/profiles/ProfileManager.js');
  appendEncounterLog('default', entry);
  return fs.readFileSync(path.join(profileDir, 'encounter-log.md'), 'utf8');
}

const base = { encounterNum: 1, line: 'Moral', stage: 'Red', timestamp: '2026-09-24T00:00:00.000Z' };

describe('encounter log — the label stays attached to its value', () => {
  it('collapses a multi-line question onto its own labelled line', async () => {
    const log = await append({
      ...base,
      // Exactly the shape the live seam produces: a narrative intro glued to the question.
      question: 'The room went quiet.\n\nWhat moved you — justice, loyalty, or self-preservation?',
      userAnswer: 'I stayed.',
      llmNarrative: 'A holding.',
    });
    expect(log).toContain('**Question:** The room went quiet. What moved you — justice, loyalty, or self-preservation?');
    // The defect: a blank line between the label and its content.
    expect(log).not.toMatch(/\*\*Question:\*\*\s*\n\s*\n/);
  });

  it('writes the player\'s words as their own labelled line', async () => {
    const log = await append({
      ...base,
      question: 'What would you say if no one were watching?',
      userAnswer: 'I told her the truth\n\n  even though it cost me the deal.',
    });
    expect(log).toContain("**User's answer:** I told her the truth even though it cost me the deal.");
  });

  it('omits the lines for fields that were not given, and never emits an empty label', async () => {
    const log = await append({ ...base, question: 'Only a question?' });
    expect(log).toContain('**Question:** Only a question?');
    expect(log).not.toContain("**User's answer:**");
    expect(log).not.toContain('**LLM narrative:**');
    // An empty label line is the failure mode `filter(l => l !== '')` cannot catch.
    expect(log).not.toMatch(/\*\*(Question|User's answer|LLM narrative):\*\*\s*$/m);
  });

  it('produces a log the focus extractor can read a question out of', async () => {
    const log = await append({
      ...base,
      question: 'You owe someone an apology you have not given. What is stopping you?',
      userAnswer: 'Nothing, honestly.',
      // The echo path: narrative equals the answer, so the extractor falls back to the question.
      llmNarrative: 'Nothing, honestly.',
    });
    const focus = extractLastNarrativeAsFocus(log);
    expect(focus).toBe('Exploring: You owe someone an apology you have not given.');
  });
});
