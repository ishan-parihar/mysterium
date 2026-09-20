# Persistence Architecture

## 1. Purpose

Describes how Mysterium stores and protects player state — Significator serialization, AES-GCM encryption, profile management, and cloud sync. The persistence layer ensures the player's developmental journey is secure, portable, and private.

## 2. Scientific basis

- **Data sensitivity** — neuropsychometric data requires encryption at rest
- **Privacy by design** — opt-in, on-device by default, never sold
- **Infinite checkpoint model** — progress saved after every encounter

## 3. Game-design mapping

### Significator Serialization

The Significator (sole state vessel) is serialized as JSON and encrypted:
```typescript
interface Significator {
  altitudes: Record<Line, Stage>;
  shadowLedger: ShadowEntry[];
  driveBalance: Record<Drive, number>;
  transformationPhase: TransformationPhase;
  theta: ThetaTimestamps;
  polarityTraces: PolarityTrace[];
  recentEncounters: EncounterRecord[];
  // ... more fields
}
```

### AES-GCM Encryption

- **Algorithm:** AES-GCM 256-bit
- **Key derivation:** SHA-256 hash of user's secret key
- **IV:** Random 12-byte initialization vector per encryption
- **Format:** Base64(IV + ciphertext)
- **Semantic security:** Identical plaintext yields different ciphertext

### Storage Locations

| Store | Path | Contents |
|---|---|---|
| SignificatorStore | `~/.mysterium/significator.enc` | Player's developmental state |
| WorldStateStore | `~/.mysterium/world.enc` | World state (active events, NPC states) |
| TelemetryStore | `~/.mysterium/telemetry.enc` | Opt-in telemetry data |
| ProfileManager | `~/.mysterium/profiles/` | Multi-profile support |

### Cloud Sync

- **Default:** On-device only
- **Opt-in:** Debounced POST to `/api/save` for cross-device sync
- **Encryption:** Client-side E2E encryption (planned, currently plaintext)

### Save Repository

`SaveRepository` abstracts all persistence:
- `save(significator)` — encrypt + write
- `load(): Significator` — read + decrypt + validate
- `recover(saveId)` — restore from backup
- `export()` / `import()` — portable save format

## 4. Architectural contract

- `src/infra/persistence/SaveRepository.ts` — Significator + world-state persistence (single repository over the KeyValueStore backends)
- `src/infra/crypto/CryptoStore.ts` — AES-GCM encryption
- `src/infra/profiles/ProfileManager.ts` — Multi-profile management
- `~/.mysterium/` — config directory (renamed from `~/.ccrpg/`)

## 5. Open questions

- **E2E encryption** — client-side encryption not yet implemented
- **Migration path** — `~/.ccrpg/` → `~/.mysterium/` migration not implemented
- **Conflict resolution** — concurrent saves from multiple devices not handled

## 6. Principles served

Principles **6, 7** — honest simulation, codebase honesty.
