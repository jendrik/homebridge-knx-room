# Homebridge KNX Room

Homebridge 2 platform plugin for KNX room temperature monitors.

## Requirements

- Homebridge 2
- Node.js 22 or 24
- KNX router or interface

## Configuration

```json
{
  "platform": "knx-room",
  "ip": "224.0.23.12",
  "port": 3671,
  "devices": [
    {
      "name": "Living Room",
      "listen_current_temperature": "1/1/1"
    }
  ]
}
```

Each configured device exposes one HomeKit temperature sensor and stores Eve-style temperature history through `fakegato-history`.
