# Security Hardening (AES-GCM Encryption) Implementation Plan

> **Status (2026-09-16):** Implemented — `src/infra/crypto/CryptoStore.ts` (AES-GCM) is live in the persistence path. Plan retained as implementation record.
> **Related:** `docs/architecture/08-persistence.md` (current persistence contract)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement robust, cryptographically secure AES-GCM 256-bit at-rest encryption for telemetry, world state, and Significator data.

**Architecture:** Update `ICryptoStore` to return Promises and refactor all calling data stores (`SignificatorStore`, `WorldStateStore`, `TelemetryStore`) to handle asynchronous cryptographic operations. Implement AES-GCM key derivation using SHA-256 digests and randomized IV byte packing.

**Tech Stack:** TypeScript, Web Crypto API, Node.js.

---

### Task 1: Refactor ICryptoStore and Implement AES-GCM

**Files:**
- Modify: `src/infra/crypto/CryptoStore.ts`
- Test: `tests/cryptoStore.test.ts` (temp disabled or stubbed during refactor)

- [ ] **Step 1: Update ICryptoStore interface and implement AES-GCM logic**
  Edit `src/infra/crypto/CryptoStore.ts` to upgrade to AES-GCM.
  ```typescript
  import { webcrypto } from 'crypto';

  const crypto = (typeof globalThis !== 'undefined' && globalThis.crypto)
    ? globalThis.crypto
    : (webcrypto as any);

  const DEFAULT_KEY = 'mysterium-telemetry-key';

  export interface ICryptoStore {
    encrypt(plaintext: string): Promise<string>;
    decrypt(ciphertext: string): Promise<string>;
  }

  export class CryptoStore implements ICryptoStore {
    private cryptoKeyPromise: Promise<any>;

    constructor(key: string = DEFAULT_KEY) {
      this.cryptoKeyPromise = this.deriveKey(key);
    }

    private async deriveKey(keyString: string): Promise<any> {
      const keyData = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(keyString)
      );
      return crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
      );
    }

    async encrypt(plaintext: string): Promise<string> {
      const cryptoKey = await this.cryptoKeyPromise;
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ciphertextBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        cryptoKey,
        new TextEncoder().encode(plaintext)
      );
      const combined = new Uint8Array(iv.length + ciphertextBuffer.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(ciphertextBuffer), iv.length);
      
      // Node/Browser safe base64 encoding
      if (typeof Buffer !== 'undefined') {
        return Buffer.from(combined).toString('base64');
      }
      return btoa(String.fromCharCode(...combined));
    }

    async decrypt(ciphertext: string): Promise<string> {
      const cryptoKey = await this.cryptoKeyPromise;
      
      // Node/Browser safe base64 decoding
      let combined: Uint8Array;
      if (typeof Buffer !== 'undefined') {
        combined = new Uint8Array(Buffer.from(ciphertext, 'base64'));
      } else {
        combined = new Uint8Array(atob(ciphertext).split('').map(c => c.charCodeAt(0)));
      }

      const iv = combined.slice(0, 12);
      const ciphertextBuffer = combined.slice(12);
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        cryptoKey,
        ciphertextBuffer
      );
      return new TextDecoder().decode(decryptedBuffer);
    }
  }
  ```

- [ ] **Step 2: Commit initial crypto refactor**
  ```bash
  git add src/infra/crypto/CryptoStore.ts
  git commit -m "feat: upgrade CryptoStore interface and implement AES-GCM encryption"
  ```

---

### Task 2: Refactor Calling Stores to Asynchronous Mode

**Files:**
- Modify: `src/infra/persistence/SignificatorStore.ts`
- Modify: `src/infra/persistence/WorldStateStore.ts`
- Modify: `src/infra/telemetry/TelemetryStore.ts`

- [ ] **Step 1: Refactor SignificatorStore save/load to await encryption**
  Update `src/infra/persistence/SignificatorStore.ts` to `await` calls:
  ```typescript
  // In save(sig):
  const encrypted = await this.crypto.encrypt(json);
  
  // In load():
  const json = await this.crypto.decrypt(encrypted);
  ```

- [ ] **Step 2: Refactor WorldStateStore save/load to await encryption**
  Update `src/infra/persistence/WorldStateStore.ts` to `await` calls:
  ```typescript
  // In save(world):
  const encrypted = await this.crypto.encrypt(json);
  
  // In load():
  const json = await this.crypto.decrypt(encrypted);
  ```

- [ ] **Step 3: Refactor TelemetryStore save/load to await encryption**
  Update `src/infra/telemetry/TelemetryStore.ts` to `await` calls:
  ```typescript
  // In save(events):
  const encrypted = await this.crypto.encrypt(json);
  
  // In load():
  const json = await this.crypto.decrypt(encrypted);
  ```

- [ ] **Step 4: Verify typecheck passes**
  Run: `npx tsc --noEmit`
  Expected: Success (excluding any tests that we haven't updated yet)

- [ ] **Step 5: Commit store refactoring**
  ```bash
  git add src/infra/persistence/SignificatorStore.ts src/infra/persistence/WorldStateStore.ts src/infra/telemetry/TelemetryStore.ts
  git commit -m "refactor: update Significator, WorldState, and Telemetry stores to be fully async"
  ```

---

### Task 3: Update and Expand Crypto and Store Tests

**Files:**
- Modify: `tests/cryptoStore.test.ts`
- Modify: `tests/integration/PhaseB.test.ts`
- Modify: `tests/telemetry/TelemetryStore.test.ts`
- Modify: `tests/telemetry/TelemetryService.test.ts`

- [ ] **Step 1: Update cryptoStore.test.ts to be async and test semantic security**
  Rewrite `tests/cryptoStore.test.ts`:
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { CryptoStore } from '../src/infra/crypto/CryptoStore.js';

  describe('CryptoStore', () => {
    it('encrypts and decrypts to original plaintext', async () => {
      const store = new CryptoStore('test-key');
      const plaintext = 'hello world telemetry data';
      const encrypted = await store.encrypt(plaintext);
      expect(encrypted).not.toBe(plaintext);
      expect(await store.decrypt(encrypted)).toBe(plaintext);
    });

    it('produces different ciphertext with different keys', async () => {
      const a = new CryptoStore('key-a');
      const b = new CryptoStore('key-b');
      const plaintext = 'same input';
      expect(await a.encrypt(plaintext)).not.toBe(await b.encrypt(plaintext));
    });

    it('guarantees semantic security (different ciphertext for same input/key)', async () => {
      const store = new CryptoStore('test-key');
      const plaintext = 'semantic security input';
      const c1 = await store.encrypt(plaintext);
      const c2 = await store.encrypt(plaintext);
      expect(c1).not.toBe(c2); // Due to randomized IV
      expect(await store.decrypt(c1)).toBe(plaintext);
      expect(await store.decrypt(c2)).toBe(plaintext);
    });

    it('handles empty string', async () => {
      const store = new CryptoStore();
      expect(await store.decrypt(await store.encrypt(''))).toBe('');
    });
  });
  ```

- [ ] **Step 2: Update store tests in integration and telemetry suites**
  Refactor `tests/integration/PhaseB.test.ts`, `tests/telemetry/TelemetryStore.test.ts`, and `tests/telemetry/TelemetryService.test.ts` to `await` any direct calls to `encrypt` / `decrypt` or ensure their store invocations are properly updated.
  *(Note: Since these tests call store.save() and store.load() which were already asynchronous, we simply need to ensure any direct mock instantiations or cryptographic assertions are properly awaited.)*

- [ ] **Step 3: Run the test suite**
  Run: `npm test`
  Expected: PASS (All tests compile and succeed)

- [ ] **Step 4: Commit tests and final review**
  ```bash
  git add tests/cryptoStore.test.ts tests/integration/PhaseB.test.ts tests/telemetry/TelemetryStore.test.ts tests/telemetry/TelemetryService.test.ts
  git commit -m "test: update crypto and store tests to async and verify security invariants"
  ```
