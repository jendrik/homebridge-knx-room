# Fakegato Homebridge 2 Shim Design

## Goal

Fix the Homebridge 2 child-bridge startup crash while keeping `fakegato-history`.

The observed crash is:

```text
TypeError: Cannot read properties of undefined (reading 'DATA')
```

It occurs inside `fakegato-history` when it reads `homebridge.hap.Formats.DATA`.

## Root Cause

`fakegato-history` expects the legacy Homebridge shape:

- `homebridge.hap.Formats`
- `homebridge.hap.Perms`

Homebridge 2 exposes those constants under:

- `api.hap.Characteristic.Formats`
- `api.hap.Characteristic.Perms`

The plugin currently passes the Homebridge 2 `API` object directly to `fakegato-history`, so `fakegato-history` sees `homebridge.hap.Formats === undefined` and crashes while constructing its Eve history characteristics.

## Design

Keep the compatibility code isolated in `src/history.ts`.

`HistoryFactory` should adapt the Homebridge 2 API into the legacy shape expected by `fakegato-history` before calling the library factory. The adapter should:

- Preserve the real Homebridge API object behavior.
- Preserve `api.hap.Service`.
- Preserve `api.hap.Characteristic`.
- Preserve `api.user.storagePath()`.
- Add `hap.Formats` from `api.hap.Characteristic.Formats`.
- Add `hap.Perms` from `api.hap.Characteristic.Perms`.

No accessory, platform, config, KNX, or release workflow behavior should change.

## Error Handling

If the Homebridge API does not expose `Characteristic.Formats` or `Characteristic.Perms`, the adapter should fail with a clear error message before calling `fakegato-history`. That makes future Homebridge API incompatibilities diagnosable instead of surfacing as a library-internal `undefined` crash.

## Verification

Required verification:

- `npm run lint`
- `npm run build`
- A focused smoke check that constructs `HistoryFactory` with a Homebridge 2-shaped API and verifies `createRoomHistory(...)` does not throw from `Formats.DATA`.

If the smoke check needs a small script instead of a full test framework, keep it local and do not introduce a broad test dependency.

## Acceptance Criteria

- `fakegato-history` remains a dependency.
- `_addEntry` remains isolated to `src/history.ts`.
- The Homebridge 2 compatibility shim is isolated to `src/history.ts`.
- Child bridge startup should no longer crash on `Formats.DATA`.
- Existing lint/build verification remains green.
