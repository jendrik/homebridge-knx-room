import type {
  API,
  AccessoryPlugin,
  Characteristic,
  Logger,
  PlatformConfig,
  Service,
  StaticPlatformPlugin,
  uuid,
} from 'homebridge';
import { Connection } from 'knx';

import { RoomAccessory } from './accessory.js';
import { HistoryFactory } from './history.js';
import { parsePlatformConfig, type RoomPlatformConfig } from './config.js';

type ManagedRoomAccessory = RoomAccessory & {
  shutdown(): void;
};

type ManagedRoomAccessoryConstructor = new (
  platform: RoomPlatform,
  config: RoomPlatformConfig['devices'][number],
) => ManagedRoomAccessory;

export class RoomPlatform implements StaticPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;
  public readonly uuid: typeof uuid;
  public readonly historyFactory: HistoryFactory;
  public readonly connection: Connection;

  private readonly roomConfig: RoomPlatformConfig;
  private readonly devices: ManagedRoomAccessory[] = [];

  constructor(
    public readonly log: Logger,
    config: PlatformConfig,
    public readonly api: API,
  ) {
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;
    this.uuid = api.hap.uuid;
    this.roomConfig = parsePlatformConfig(config, log);
    this.historyFactory = new HistoryFactory(api);
    this.connection = this.createConnection();

    const RoomAccessoryWithLifecycle = RoomAccessory as unknown as ManagedRoomAccessoryConstructor;
    this.devices = this.roomConfig.devices.map((device) => new RoomAccessoryWithLifecycle(this, device));

    api.on('shutdown', () => {
      this.shutdown();
    });

    log.info(`Initialized ${this.devices.length} KNX room monitor accessory/accessories.`);
  }

  accessories(callback: (foundAccessories: AccessoryPlugin[]) => void): void {
    callback(this.devices);
  }

  private createConnection(): Connection {
    return new Connection({
      ipAddr: this.roomConfig.ip,
      ipPort: this.roomConfig.port,
      handlers: {
        connected: () => {
          this.log.info('KNX connected.');
        },
        disconnected: () => {
          this.log.info('KNX disconnected.');
        },
        error: (connstatus: unknown) => {
          this.log.error(`KNX connection error: ${String(connstatus)}`);
        },
      },
    });
  }

  private shutdown(): void {
    for (const device of this.devices) {
      device.shutdown();
    }

    this.connection.Disconnect(() => {
      this.log.info('KNX disconnect requested.');
    });
  }
}
