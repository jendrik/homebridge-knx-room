import type { Logger, PlatformConfig } from 'homebridge';
import { isIP } from 'node:net';

export const DEFAULT_KNX_IP = '224.0.23.12';
export const DEFAULT_KNX_PORT = 3671;

const GROUP_ADDRESS_PATTERN = /^[0-9]{1,4}\/[0-9]{1,4}\/[0-9]{1,4}$/;
const HOSTNAME_LABEL_PATTERN = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
const INTEGER_STRING_PATTERN = /^[0-9]+$/;
const IPV4_ADDRESS_LIKE_PATTERN = /^[0-9]+(?:\.[0-9]+)+$/;

export interface RoomDeviceConfig {
  name: string;
  listenCurrentTemperature: string;
}

export interface RoomPlatformConfig {
  ip: string;
  port: number;
  devices: RoomDeviceConfig[];
}

interface RawRoomDeviceConfig {
  name?: unknown;
  listen_current_temperature?: unknown;
}

export function parsePlatformConfig(config: PlatformConfig, log: Logger): RoomPlatformConfig {
  return {
    ip: parseIp(config.ip, log),
    port: parsePort(config.port, log),
    devices: parseDevices(config.devices, log),
  };
}

function parseIp(value: unknown, log: Logger): string {
  if (typeof value === 'string') {
    const host = value.trim();
    if (isValidHost(host)) {
      return host;
    }
  }

  if (value !== undefined) {
    log.warn(`Invalid KNX ip value ${String(value)}; using ${DEFAULT_KNX_IP}`);
  }

  return DEFAULT_KNX_IP;
}

function parsePort(value: unknown, log: Logger): number {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= 65535) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim();
    const parsed = INTEGER_STRING_PATTERN.test(trimmedValue) ? Number.parseInt(trimmedValue, 10) : NaN;
    if (Number.isInteger(parsed) && parsed > 0 && parsed <= 65535) {
      log.warn('KNX port is configured as a string; update config to use a number.');
      return parsed;
    }
  }

  if (value !== undefined) {
    log.warn(`Invalid KNX port value ${String(value)}; using ${DEFAULT_KNX_PORT}`);
  }

  return DEFAULT_KNX_PORT;
}

function parseDevices(value: unknown, log: Logger): RoomDeviceConfig[] {
  if (!Array.isArray(value)) {
    log.warn('No KNX room devices configured.');
    return [];
  }

  return value.flatMap((entry, index) => parseDevice(entry, index, log));
}

function parseDevice(entry: unknown, index: number, log: Logger): RoomDeviceConfig[] {
  if (!isRawRoomDeviceConfig(entry)) {
    log.warn(`Skipping KNX room device at index ${index}: device must be an object.`);
    return [];
  }

  const name = typeof entry.name === 'string' ? entry.name.trim() : '';
  const listenCurrentTemperature = typeof entry.listen_current_temperature === 'string'
    ? entry.listen_current_temperature.trim()
    : '';

  if (name.length === 0) {
    log.warn(`Skipping KNX room device at index ${index}: name must be a non-empty string.`);
    return [];
  }

  if (!GROUP_ADDRESS_PATTERN.test(listenCurrentTemperature)) {
    log.warn(`Skipping KNX room device "${name}": listen_current_temperature must be a KNX group address.`);
    return [];
  }

  return [{ name, listenCurrentTemperature }];
}

function isValidHost(value: string): boolean {
  if (value.length === 0 || value.length > 253) {
    return false;
  }

  if (isIP(value) !== 0) {
    return true;
  }

  if (IPV4_ADDRESS_LIKE_PATTERN.test(value)) {
    return false;
  }

  const labels = value.endsWith('.') ? value.slice(0, -1).split('.') : value.split('.');
  return labels.every((label) => HOSTNAME_LABEL_PATTERN.test(label));
}

function isRawRoomDeviceConfig(value: unknown): value is RawRoomDeviceConfig {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
