# Design Specification — Security Hardening (AES-GCM Telemetry & State Encryption)

**Date:** June 18, 2026  
**Status:** Approved  
**Topic:** Upgrading CryptoStore to use cryptographically secure AES-GCM 256-bit encryption.

---

## 1. Context & Objectives

Currently, Mysterium uses a placeholder `CryptoStore` that performs a simple XOR + Base64 obfuscation. While this hides data from casual inspection in localStorage, it does not provide true cryptographic confidentiality. To achieve 100% actualization of the vision of a private, secure developmental tool, we must upgrade the storage layers to use industry-standard AES-GCM 256-bit encryption.

---

## 2. Technical Design

### 2.1 Refactoring ICryptoStore & Callers
The standard Web Crypto API is asynchronous. Therefore, `ICryptoStore` and all store modules that depend on it must be updated to handle Promises.

#### Interface Modification (`src/infra/crypto/CryptoStore.ts`):
```typescript
export interface ICryptoStore {
  encrypt(plaintext: string): Promise<string>;
  decrypt(ciphertext: string): Promise<string>;
}
```

#### Calling Stores Modification:
Update files to `await` the encryption and decryption methods:
1. **SignificatorStore (`src/infra/persistence/SignificatorStore.ts`):**
   - In `save()`, change `const encrypted = this.crypto.encrypt(json)` to `const encrypted = await this.crypto.encrypt(json)`.
   - In `load()`, change `const json = this.crypto.decrypt(encrypted)` to `const json = await this.crypto.decrypt(encrypted)`.
2. **WorldStateStore (`src/infra/persistence/WorldStateStore.ts`):**
   - Same modifications in `save()` and `load()`.
3. **TelemetryStore (`src/infra/telemetry/TelemetryStore.ts`):**
   - Same modifications in `save()` and `load()`.

---

## 3. Cryptographic Implementation (`src/infra/crypto/CryptoStore.ts`)

### 3.1 Web Crypto API Integration
Use `globalThis.crypto` (in browser) or import `webcrypto` from Node.js `'crypto'` if running in a Node-based environment:
```typescript
import { webcrypto } from 'crypto';
const crypto = (typeof globalThis !== 'undefined' && globalThis.crypto) 
  ? globalThis.crypto 
  : (webcrypto as any);
```

### 3.2 Key Derivation
To obtain a secure 256-bit Key from the user's secret key string:
1. Hash the key string using SHA-256.
2. Import the resulting hash raw bytes as a standard CryptoKey for AES-GCM:
   ```typescript
   const keyData = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(keyString));
   const cryptoKey = await crypto.subtle.importKey(
     'raw',
     keyData,
     { name: 'AES-GCM' },
     false,
     ['encrypt', 'decrypt']
   );
   ```

### 3.3 Encryption Routine (`encrypt`)
1. Generate a random 12-byte initialization vector (IV) to guarantee semantic security (identical inputs yield different outputs):
   ```typescript
   const iv = crypto.getRandomValues(new Uint8Array(12));
   ```
2. Encrypt the plaintext string (encoded as UTF-8) using AES-GCM:
   ```typescript
   const ciphertextBuffer = await crypto.subtle.encrypt(
     { name: 'AES-GCM', iv },
     cryptoKey,
     new TextEncoder().encode(plaintext)
   );
   ```
3. Prepend the 12-byte IV to the ciphertext, compile them into a single byte array, and encode the output as Base64:
   ```typescript
   const combined = new Uint8Array(iv.length + ciphertextBuffer.byteLength);
   combined.set(iv, 0);
   combined.set(new Uint8Array(ciphertextBuffer), iv.length);
   const base64 = btoa(String.fromCharCode(...combined));
   ```

### 3.4 Decryption Routine (`decrypt`)
1. Decode the Base64 ciphertext back to a byte array:
   ```typescript
   const combined = new Uint8Array(atob(ciphertext).split('').map(c => c.charCodeAt(0)));
   ```
2. Slice the first 12 bytes to extract the `iv`. Slices the remaining bytes to extract the `ciphertextBuffer`.
3. Decrypt using AES-GCM and the derived key:
   ```typescript
   const decryptedBuffer = await crypto.subtle.decrypt(
     { name: 'AES-GCM', iv },
     cryptoKey,
     ciphertextBuffer
   );
   return new TextDecoder().decode(decryptedBuffer);
   ```

---

## 4. Verification Plan

1. **Unit Tests:** Update `tests/cryptoStore.test.ts` to use asynchronous assertions. Verify that:
   - Encrypting/decrypting returns the correct original text.
   - Encrypting the same plaintext twice with the same key yields DIFFERENT ciphertexts (semantic security test).
   - Empty strings are correctly handled.
2. **Integration Tests:** Verify that `tests/integration/PhaseB.test.ts` and `tests/telemetry/TelemetryService.test.ts` run and pass.
