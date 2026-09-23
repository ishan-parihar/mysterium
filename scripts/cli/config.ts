// @script-status: wired — imported by cli-game.ts, which `npm run cli` runs. No side effects of its own.
/**
 * CLI configuration — where the state root's `config.json` lives, and reading/writing it.
 */
import * as fs from 'fs';
import * as path from 'path';
import { getMysteriumLegacyDir } from '../../src/infra/persistence/mysteriumDir.js';

// ── Config file loading ──────────────────────────────────────────────
export interface MysteriumConfig {
  llm?: {
    provider?: 'ollama' | 'openai' | 'anthropic' | 'gemini' | 'custom';
    apiKey?: string;
    baseUrl?: string;
    model?: string;
  };
  session?: { defaultEncounters?: number; defaultMode?: string; };
}

export const CONFIG_DIR = getMysteriumLegacyDir();

export const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export function loadConfig(): MysteriumConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) as MysteriumConfig;
  } catch { /* ignore */ }
  return {};
}

export function saveConfig(config: MysteriumConfig): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}
