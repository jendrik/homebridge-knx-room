# Homebridge 2 Modernization Design

## Goal

Update `@jendrik/homebridge-knx-room` for Homebridge 2 only. Backward compatibility with Homebridge 1, Node 18, and older CommonJS runtime assumptions is not required.

The plugin remains a small KNX room temperature platform. It keeps `StaticPlatformPlugin` and keeps Eve-style history support through `fakegato-history`.

## Current State

The plugin is a compact TypeScript Homebridge platform with three runtime files:

- `src/index.ts` registers the platform.
- `src/platform.ts` creates the KNX connection and builds room accessories from `config.devices`.
- `src/accessory.ts` exposes one `TemperatureSensor`, listens to one KNX datapoint, and writes history entries.

The current package baseline targets Homebridge 1 and Node 18/20, uses CommonJS output, TypeScript 4, ESLint 8, `rimraf` 3, `nodemon` 2, `knx` 2.5.2, and `fakegato-history` 0.6.4.

Homebridge 2 requires Node 22 or 24 and is loaded as ESM. Its plugin developer guidance recommends using HAP types through the `homebridge` package rather than depending on HAP internals.

## Scope

In scope:

- Make the package Homebridge 2 only.
- Convert package and TypeScript output to an ESM-compatible shape.
- Keep `StaticPlatformPlugin`.
- Keep `fakegato-history`.
- Update runtime and development dependencies.
- Tighten config parsing and validation.
- Improve KNX datapoint setup and logging.
- Avoid misleading history entries before a temperature value is known.
- Clean up timers and connection lifecycle on shutdown.
- Update CI to verify supported Node versions.
- Keep the plugin behavior focused on KNX current temperature sensors.

Out of scope:

- Homebridge 1 compatibility.
- Node 18 or Node 20 compatibility.
- Dynamic platform cached accessories.
- Matter-specific accessory behavior.
- Additional KNX datapoints or room monitor features beyond current temperature.
- A large test framework migration unless it is needed to verify the modernization.

## Package Baseline

The package should declare:

- `engines.homebridge`: `^2.0.0`
- `engines.node`: `^22 || ^24`

The development dependency on `homebridge` should move to the current Homebridge 2 release. Node typings should match the supported Node runtime line.

The package should use ESM-compatible loading. Source should use `import`/`export` syntax throughout, and the compiled package should be loadable by Homebridge 2 without CommonJS `require()` assumptions.

The TypeScript target should move to a Node 22-appropriate baseline. The implementation can continue to compile to `dist/`, generate declarations and source maps, and keep a narrow published surface.

## Architecture

The runtime layout remains intentionally small:

- `src/index.ts`: registers the platform with Homebridge.
- `src/platform.ts`: owns Homebridge API references, config parsing, KNX connection setup, accessory list construction, and shutdown cleanup.
- `src/accessory.ts`: owns one temperature accessory, HomeKit service setup, one KNX datapoint subscription, current temperature state, and periodic history logging.

Small helper files may be added when they reduce coupling:

- Config types and validation helpers.
- A fakegato history adapter.
- KNX datapoint typing helpers, if the `knx` package API requires unsafe type handling.

The fakegato adapter should be the only place that knows about private fakegato methods such as `_addEntry`, if the library still requires them.

## Configuration

Global config:

- `ip`: optional string, defaulting to `224.0.23.12`.
- `port`: optional number, defaulting to `3671`.
- `devices`: array of room monitor definitions.

Device config:

- `name`: required non-empty string.
- `listen_current_temperature`: required KNX group address string.

Invalid device entries should be skipped with clear Homebridge log messages. Invalid global config should fall back to safe defaults when possible, with a warning. Startup should not crash because one configured room monitor entry is malformed.

`config.schema.json` should model `port` as a number and keep the group address pattern for `listen_current_temperature`.

## Accessory Behavior

Each valid device exposes one HomeKit `TemperatureSensor`.

For each accessory:

- Create an `AccessoryInformation` service with name, manufacturer, model, serial number, and firmware revision.
- Create a `TemperatureSensor` service.
- Mark `StatusActive` as true once the accessory is initialized.
- Create a KNX datapoint for `listen_current_temperature` using `DPT9.001`.
- Request an initial KNX read.
- On KNX value changes, update the latest temperature, update HomeKit `CurrentTemperature`, and write one fakegato history entry.
- Periodically write the latest known temperature to fakegato history to avoid graph gaps.

The periodic fakegato entry should be skipped until a real KNX temperature value has been received. The plugin should not write an initial `0.0` history value unless KNX actually reports `0.0`.

Intervals should be stored and cleared during Homebridge shutdown.

## KNX Connection

The platform owns one KNX `Connection` shared by all room accessories.

The connection should:

- Use configured `ip` and `port`, with defaults.
- Log successful connection.
- Log connection errors with useful context.
- Avoid throwing from asynchronous KNX handlers.

If the KNX library exposes a close or disconnect API that is safe to call, the platform should call it during Homebridge shutdown. If no reliable shutdown API exists, this should be documented in code rather than guessed.

## Tooling And Dependencies

Update dependencies as part of the modernization:

- `homebridge` to Homebridge 2.
- `knx` to the latest 2.5.x version.
- `fakegato-history` to the latest 0.6.x version.
- `@types/node` to a Node 22-compatible line.
- TypeScript to the current compatible major.
- ESLint and `@typescript-eslint/*` to current compatible versions.
- `rimraf`, `nodemon`, and related development tooling to current compatible versions.

ESLint may move to flat config if the migration is straightforward. If it creates unnecessary churn, keeping a legacy config with updated packages is acceptable for this pass.

## CI And Verification

GitHub Actions should verify both supported Node lines:

- Node 22
- Node 24

The primary verification commands are:

- `npm ci`
- `npm run lint`
- `npm run build`

Additional tests are optional. A new test framework should only be introduced if it provides clear value for the modernization and does not require broad mocking of Homebridge and KNX internals.

## Existing Worktree Changes

The implementation must preserve existing uncommitted user changes in:

- `.github/workflows/build.yml`
- `.vscode/settings.json`
- `src/accessory.ts`
- `.github/workflows/package.yml`

These files may be edited as part of the modernization, but their existing intent should be kept unless it conflicts with Homebridge 2 readiness.

## Acceptance Criteria

- The plugin is Homebridge 2 only.
- The package no longer declares Homebridge 1, Node 18, or Node 20 support.
- Homebridge registration is ESM-compatible.
- `StaticPlatformPlugin` remains in use.
- `fakegato-history` remains in use and is isolated behind a narrow boundary if private methods are required.
- Invalid device config is skipped with clear logs.
- Periodic history logging does not write a synthetic `0.0` before the first KNX reading.
- Timers are cleaned up on shutdown.
- Dependencies and lockfile are refreshed.
- CI verifies Node 22 and Node 24.
- `npm ci`, lint, and build pass from a clean dependency install.
