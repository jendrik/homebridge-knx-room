import type { API, Logger, Service } from 'homebridge';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const fakegato = require('fakegato-history') as (api: API) => unknown;

type FakeGatoFactory = new (
  accessoryType: string,
  accessory: { displayName: string },
  options: { storage: 'fs'; log: Logger; disableTimer: boolean }
) => Service & {
  _addEntry(entry: TemperatureHistoryEntry): void;
};

interface TemperatureHistoryEntry {
  time: number;
  temp: number;
}

export class HistoryFactory {
  private readonly FakeGatoHistoryService: FakeGatoFactory;

  constructor(api: API) {
    this.FakeGatoHistoryService = fakegato(api) as FakeGatoFactory;
  }

  createRoomHistory(accessory: { displayName: string }, log: Logger): TemperatureHistory {
    const service = new this.FakeGatoHistoryService('room', accessory, {
      storage: 'fs',
      log,
      disableTimer: true,
    });

    return new TemperatureHistory(service);
  }
}

export class TemperatureHistory {
  constructor(public readonly service: Service & { _addEntry(entry: TemperatureHistoryEntry): void }) {}

  addTemperature(temperature: number): void {
    this.service._addEntry({
      time: Math.round(Date.now() / 1000),
      temp: temperature,
    });
  }
}
