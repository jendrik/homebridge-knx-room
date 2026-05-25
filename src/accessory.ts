import type { AccessoryPlugin, Service } from 'homebridge';
import { Datapoint } from 'knx';

import { PLUGIN_DISPLAY_NAME, PLUGIN_VERSION } from './settings.js';
import type { RoomDeviceConfig } from './config.js';
import type { TemperatureHistory } from './history.js';
import type { RoomPlatform } from './platform.js';

type KnxValue = number | string | boolean | Date;
const LEGACY_PLUGIN_NAME = 'homebridge-knx-room';

export class RoomAccessory implements AccessoryPlugin {
  private readonly name: string;
  public readonly uuid_base: string;
  public readonly displayName: string;

  private readonly temperatureSensorService: Service;
  private readonly loggingService: TemperatureHistory;
  private readonly informationService: Service;
  private readonly currentTemperatureDatapoint: Datapoint;
  private readonly historyInterval: NodeJS.Timeout;

  private currentTemperature: number | undefined;
  private isShutdown = false;

  constructor(
    private readonly platform: RoomPlatform,
    config: RoomDeviceConfig,
  ) {
    this.name = config.name;
    this.uuid_base = platform.uuid.generate(`${LEGACY_PLUGIN_NAME}-${this.name}-${config.listenCurrentTemperature}`);
    this.displayName = this.uuid_base;

    this.informationService = new platform.Service.AccessoryInformation()
      .setCharacteristic(platform.Characteristic.Name, this.name)
      .setCharacteristic(platform.Characteristic.Manufacturer, '@jendrik')
      .setCharacteristic(platform.Characteristic.Model, PLUGIN_DISPLAY_NAME)
      .setCharacteristic(platform.Characteristic.SerialNumber, this.displayName)
      .setCharacteristic(platform.Characteristic.FirmwareRevision, PLUGIN_VERSION);

    this.temperatureSensorService = new platform.Service.TemperatureSensor(this.name);
    this.temperatureSensorService.getCharacteristic(platform.Characteristic.StatusActive).updateValue(true);

    this.loggingService = platform.historyFactory.createRoomHistory(this, platform.log);

    this.currentTemperatureDatapoint = new Datapoint({
      ga: config.listenCurrentTemperature,
      dpt: 'DPT9.001',
      autoread: true,
    }, platform.connection);

    this.currentTemperatureDatapoint.on('change', (_oldValue: KnxValue, newValue: KnxValue) => {
      this.handleTemperatureChange(newValue);
    });

    this.historyInterval = setInterval(() => {
      this.addPeriodicHistoryEntry();
    }, 10 * 60 * 1000);
  }

  getServices(): Service[] {
    return [
      this.informationService,
      this.temperatureSensorService,
      this.loggingService.service,
    ];
  }

  shutdown(): void {
    this.isShutdown = true;
    clearInterval(this.historyInterval);
    this.currentTemperatureDatapoint.removeAllListeners('change');
  }

  private handleTemperatureChange(value: KnxValue): void {
    if (this.isShutdown) {
      return;
    }

    if (typeof value !== 'number' || !Number.isFinite(value)) {
      this.platform.log.warn(`Ignoring invalid KNX temperature for ${this.name}: ${String(value)}`);
      return;
    }

    this.currentTemperature = value;
    this.temperatureSensorService.getCharacteristic(this.platform.Characteristic.CurrentTemperature).updateValue(value);
    this.loggingService.addTemperature(value);
  }

  private addPeriodicHistoryEntry(): void {
    if (this.isShutdown) {
      return;
    }

    if (this.currentTemperature === undefined) {
      this.platform.log.debug(`Skipping periodic history entry for ${this.name}: no KNX temperature received yet.`);
      return;
    }

    this.loggingService.addTemperature(this.currentTemperature);
  }
}
