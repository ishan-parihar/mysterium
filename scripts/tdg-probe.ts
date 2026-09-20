/**
 * TDG integration probe — verifies Mysterium ↔ TDG-Rust wiring on demand.
 * Spawns the real TDG-Rust binary, performs the MCP handshake, lists tools,
 * and confirms the agent's 7 expected TDG tools are present.
 *
 * Exit 0 = integration verified. Exit 1 = TDG unavailable or wiring broken.
 *
 * Usage: LD_LIBRARY_PATH=<hermes>/tdg-rust/lib TDG_HOME=<hermes> npx tsx scripts/tdg-probe.ts
 */
// @script-status: probe — read-only integration check against the TDG-Rust binary; spawns a
//                         subprocess and mutates nothing. NOT wired to install.sh: the earlier
//                         docstring claimed it was and that claim was false (KB-ORPHAN-TRIAGE,
//                         KB audit UT-7). Run it by hand when the TDG seam is suspected.
import { TDGClient } from '../src/infra/tdg/TDGClient.js';

async function main(): Promise<void> {
  const client = new TDGClient();

  if (!client.isAvailable()) {
    console.error('TDG-Rust binary not found.');
    process.exit(1);
  }
  console.log('✓ TDG-Rust binary available');

  await client.start();
  if (!client.isRunning()) {
    console.error('TDG-Rust failed to start (MCP handshake did not complete).');
    process.exit(1);
  }
  console.log('✓ TDG-Rust MCP server started');

  const tools = client.getTools();
  console.log(`✓ tools/list returned ${tools.length} tools`);

  const expected = [
    'tdg_search', 'tdg_create', 'tdg_connect', 'tdg_reflect',
    'tdg_fetch_context', 'tdg_tick', 'tdg_health',
  ];
  let allFound = true;
  for (const name of expected) {
    const found = tools.some(t => t.name === name);
    console.log(`  ${found ? '✓' : '✗'} ${name}`);
    if (!found) allFound = false;
  }
  if (!allFound) {
    console.error('One or more expected TDG tools are missing.');
    client.stop();
    process.exit(1);
  }

  client.stop();
  console.log('✓ TDG-Rust process stopped cleanly');
  console.log('');
  console.log('Mysterium ↔ TDG-Rust integration verified.');
}

main().catch(err => {
  console.error('TDG probe failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
