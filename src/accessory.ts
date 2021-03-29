import { AccessoryConfig, AccessoryPlugin, Service } from 'homebridge';

import { Datapoint } from 'knx';
import fakegato from 'fakegato-history';

import { PLUGIN_NAME, PLUGIN_VERSION, PLUGIN_DISPLAY_NAME } from './settings';

import { RoomPlatform } from './platform';


export class RoomAccessory implements AccessoryPlugin {
  private readonly uuid_base: string;
  private readonly name: string;
  private readonly displayName: string;

  private readonly listen_current_temperature: string;

  private readonly temperatureSensorService: Service;
  private readonly loggingService: fakegato;
  private readonly informationService: Service;

  constructor(
    private readonly platform: RoomPlatform,
    private readonly config: AccessoryConfig,
  ) {

    this.name = config.name;
    this.listen_current_temperature = config.listen_current_temperature;
    this.uuid_base = platform.uuid.generate(PLUGIN_NAME + '-' + this.name + '-' + this.listen_current_temperature);
    this.displayName = this.uuid_base;

    this.informationService = new platform.Service.AccessoryInformation()
      .setCharacteristic(platform.Characteristic.Name, this.name)
      .setCharacteristic(platform.Characteristic.Identify, this.name)
      .setCharacteristic(platform.Characteristic.Manufacturer, '@jendrik')
      .setCharacteristic(platform.Characteristic.Model, PLUGIN_DISPLAY_NAME)
      .setCharacteristic(platform.Characteristic.SerialNumber, this.displayName)
      .setCharacteristic(platform.Characteristic.FirmwareRevision, PLUGIN_VERSION);

    this.temperatureSensorService = new platform.Service.TemperatureSensor(this.name);
    this.temperatureSensorService.getCharacteristic(platform.Characteristic.StatusActive).updateValue(true);

    this.loggingService = new platform.fakeGatoHistoryService('room', this, { storage: 'fs', log: platform.log });

    const dp_listen_current_temperature = new Datapoint({
      ga: this.listen_current_temperature,
      dpt: 'DPT9.001',
      autoread: true,
    }, platform.connection);

    dp_listen_current_temperature.on('change', (oldValue: number, newValue: number) => {
      const current_temperature = newValue;
      this.temperatureSensorService.getCharacteristic(platform.Characteristic.CurrentTemperature).updateValue(current_temperature);
      this.loggingService._addEntry({ time: Math.round(new Date().valueOf() / 1000), temp: current_temperature });
    });
  }

  getServices(): Service[] {
    return [
      this.informationService,
      this.temperatureSensorService,
      this.loggingService,
    ];
  }
}
