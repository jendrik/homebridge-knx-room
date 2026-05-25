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
import { isIPv4 } from 'node:net';

import { RoomAccessory } from './accessory.js';
import { HistoryFactory } from './history.js';
import { parsePlatformConfig, type RoomPlatformConfig } from './config.js';

export class RoomPlatform implements StaticPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;
  public readonly uuid: typeof uuid;
  public readonly historyFactory: HistoryFactory;
  public readonly connection: Connection;

  private readonly roomConfig: RoomPlatformConfig;
  private readonly devices: RoomAccessory[] = [];
  private hasShutdown = false;

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

    this.devices = this.roomConfig.devices.map((device) => new RoomAccessory(this, device));

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
    if (this.hasShutdown) {
      return;
    }

    this.hasShutdown = true;

    for (const [index, device] of this.devices.entries()) {
      try {
        device.shutdown();
      } catch (error) {
        this.log.error(`Failed to shut down KNX room accessory at index ${index}: ${String(error)}`);
      }
    }

    if (isKnxRoutingAddress(this.roomConfig.ip)) {
      this.log.info('Skipping KNX disconnect for routing connection.');
      return;
    }

    this.connection.Disconnect(() => {
      this.log.info('KNX disconnect completed.');
    });
  }
}

function isKnxRoutingAddress(ipAddress: string): boolean {
  if (!isIPv4(ipAddress)) {
    return false;
  }

  const firstOctet = Number.parseInt(ipAddress.split('.')[0] ?? '', 10);
  return firstOctet >= 224 && firstOctet <= 239;
}
