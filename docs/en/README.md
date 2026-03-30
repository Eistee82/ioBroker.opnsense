![Logo](../../admin/opnsense.png)

# ioBroker.opnsense — Documentation

Monitor your [OPNsense](https://opnsense.org) firewall from ioBroker. This adapter uses the OPNsense REST API to read gateway status, interface traffic speeds, service states, firmware information, and the ARP table.

> **Trademark Notice:** [OPNsense](https://opnsense.org) is a registered trademark of [Deciso B.V.](https://www.deciso.com/). The OPNsense logo is used in accordance with the [OPNsense legal guidelines](https://opnsense.org/legal-guidelines/) to identify this adapter as a tool for OPNsense integration. This project is not affiliated with or endorsed by Deciso B.V. or the OPNsense project.

## Table of Contents

- [OPNsense Setup](#opnsense-setup)
  - [Create API User](#1-create-api-user)
  - [Create Group with Privileges](#2-create-group-with-privileges)
  - [Assign User to Group](#3-assign-user-to-group)
  - [Generate API Key](#4-generate-api-key)
- [Adapter Configuration](#adapter-configuration)
- [States Reference](#states-reference)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)

---

## OPNsense Setup

The adapter needs an API user with specific privileges to read data from your OPNsense firewall. Follow these steps carefully.

### 1. Create API User

1. Log in to the OPNsense web interface
2. Navigate to **System > Access > Users**
3. Click **Add** (+ button)
4. Fill in:
   - **Username**: `iobroker_api` (or any name you prefer)
   - **Password**: Set a strong password (not used for API access, but required)
   - **Login shell**: `/sbin/nologin`
   - **Full name**: `ioBroker API Access`
5. Click **Save**

### 2. Create Group with Privileges

1. Navigate to **System > Access > Groups**
2. Click **Add** (+ button)
3. **Group name**: `iobroker_readonly`
4. **Description**: `Read-only API access for ioBroker`
5. Click **Save**
6. Click the **Edit** button (pencil icon) on the newly created group
7. In the **Assigned Privileges** section, click **Edit**
8. Add the following privileges:

| Privilege | Required for |
|-----------|-------------|
| **System: Gateways** | Gateway status (online/offline, delay, packet loss) |
| **Reporting: Traffic** | Interface traffic data |
| **System: Firmware** | Firmware version and update status |
| **Status: Services** | Service running states |
| **Status: Interfaces** | Interface information |
| **Diagnostics: Netstat** | Interface statistics (packets, errors) |
| **Diagnostics: ARP Table** | ARP table (IP, MAC, hostname) |

9. Click **Save**

### 3. Assign User to Group

1. Navigate to **System > Access > Users**
2. Click **Edit** on the `iobroker_api` user
3. In the **Group Memberships** section, add the user to the `iobroker_readonly` group
4. Click **Save**

### 4. Generate API Key

1. Navigate to **System > Access > Users**
2. Click **Edit** on the `iobroker_api` user
3. Scroll down to the **API keys** section
4. Click the **+** (Add) button
5. A file will be downloaded automatically containing:
   - **key**: Your API Key
   - **secret**: Your API Secret

> **Important:** The API secret is shown only once during download! If you lose it, you must generate a new key pair.

The downloaded file looks like this:
```ini
key=your-api-key-here
secret=your-api-secret-here
```

---

## Adapter Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| **Host** | IP address or hostname of your OPNsense firewall | — |
| **Port** | HTTPS port | `443` |
| **API Key** | API key from the downloaded key file | — |
| **API Secret** | API secret from the downloaded key file (stored encrypted) | — |
| **Poll Interval** | How often to query OPNsense, in seconds (minimum: 10) | `30` |
| **Request Timeout** | Timeout for individual API requests, in seconds | `10` |
| **Verify SSL Certificate** | Verify the SSL certificate of OPNsense. Disable if using a self-signed certificate. | `true` |

---

## States Reference

### info

| State | Type | Description |
|-------|------|-------------|
| `info.connection` | boolean | `true` if connected to OPNsense |
| `info.lastUpdate` | number | Timestamp of last successful poll |

### system

| State | Type | Unit | Description |
|-------|------|------|-------------|
| `system.firmwareVersion` | string | | Current firmware version |
| `system.productName` | string | | Product name (e.g., "OPNsense") |
| `system.productArch` | string | | System architecture |
| `system.updateAvailable` | boolean | | `true` if firmware update is available |
| `system.updateCount` | number | | Number of available updates |
| `system.needsReboot` | boolean | | `true` if system needs a reboot |

### gateways.\<name\>

One channel per configured gateway.

| State | Type | Unit | Description |
|-------|------|------|-------------|
| `gateways.<name>.address` | string | | Gateway IP address |
| `gateways.<name>.status` | string | | Status text |
| `gateways.<name>.online` | boolean | | `true` if gateway is online |
| `gateways.<name>.loss` | number | % | Packet loss percentage |
| `gateways.<name>.delay` | number | ms | Round-trip delay |
| `gateways.<name>.stddev` | number | ms | Delay standard deviation |

### interfaces.\<name\>

One channel per network interface.

| State | Type | Unit | Description |
|-------|------|------|-------------|
| `interfaces.<name>.status` | string | | Interface status |
| `interfaces.<name>.enabled` | boolean | | Interface enabled |
| `interfaces.<name>.macAddress` | string | | MAC address |
| `interfaces.<name>.mtu` | number | | Maximum transmission unit |

#### interfaces.\<name\>.traffic

| State | Type | Unit | Description |
|-------|------|------|-------------|
| `...traffic.bytesReceivedSpeed` | number | B/s | Current receive speed in bytes/s |
| `...traffic.bytesTransmittedSpeed` | number | B/s | Current transmit speed in bytes/s |
| `...traffic.bitsReceivedSpeed` | number | bit/s | Current receive speed in bits/s |
| `...traffic.bitsTransmittedSpeed` | number | bit/s | Current transmit speed in bits/s |

> **Note:** Traffic speed is calculated as the difference between two consecutive polls divided by the time interval. The first poll after adapter start will not show speed values.

#### interfaces.\<name\>.statistics

| State | Type | Description |
|-------|------|-------------|
| `...statistics.packetsIn` | number | Total packets received |
| `...statistics.packetsOut` | number | Total packets transmitted |
| `...statistics.errorsIn` | number | Total input errors |
| `...statistics.errorsOut` | number | Total output errors |

### services.\<name\>

One channel per service.

| State | Type | Description |
|-------|------|-------------|
| `services.<name>.running` | boolean | `true` if service is running |
| `services.<name>.description` | string | Service description |

### arp.\<ip\>

One channel per ARP table entry.

| State | Type | Description |
|-------|------|-------------|
| `arp.<ip>.ip` | string | IP address |
| `arp.<ip>.mac` | string | MAC address |
| `arp.<ip>.interface` | string | Network interface |
| `arp.<ip>.hostname` | string | Hostname (if known) |
| `arp.<ip>.manufacturer` | string | Device manufacturer (from MAC) |

---

## Troubleshooting

### "SSL certificate error" / "self-signed certificate"
Your OPNsense uses a self-signed SSL certificate. Disable **Verify SSL Certificate** in the adapter settings.

### "HTTP 401" / "Unauthorized"
- Check that API Key and API Secret are correct
- Make sure the API user has the required privileges (see [OPNsense Setup](#opnsense-setup))
- Verify the API key has not been revoked

### "HTTP 403" / "Forbidden"
The API user is missing privileges for specific endpoints. Check that all 7 privileges from the setup guide are assigned.

### "ECONNREFUSED" / "ETIMEDOUT"
- Check that the OPNsense host and port are correct
- Verify network connectivity between ioBroker and OPNsense
- Check that the OPNsense web interface is accessible

### Traffic speed shows 0
Traffic speed is calculated from the difference between two polls. After adapter start, the first speed values appear after the second poll cycle.

---

## FAQ

**Q: How often should I poll?**
A: The default of 30 seconds is a good balance. For real-time traffic monitoring, you can reduce to 10 seconds. Very frequent polling (< 15s) may increase OPNsense CPU load slightly.

**Q: Can I control services (start/stop) from ioBroker?**
A: Not yet. This is planned for a future release.

**Q: Does the adapter work with pfSense?**
A: No. pfSense uses a different API. This adapter is specifically designed for OPNsense.
