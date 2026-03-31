import * as utils from '@iobroker/adapter-core';
import { OPNsenseClient } from './lib/opnsense-client.js';
import { systemStates, gatewayStates, interfaceStates, interfaceTrafficStates, interfaceStatisticsStates, serviceStates, arpStates, infoStates, } from './lib/state-definitions.js';
class OPNsense extends utils.Adapter {
    client;
    pollTimer;
    previousTraffic = new Map();
    constructor(options = {}) {
        super({
            ...options,
            name: 'opnsense',
        });
        this.on('ready', this.onReady.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }
    async onReady() {
        const config = this.config;
        if (!config.host) {
            this.log.error('No OPNsense host configured');
            return;
        }
        if (!config.apiKey || !config.apiSecret) {
            this.log.error('API key and secret must be configured');
            return;
        }
        if (config.pollInterval < 10) {
            this.log.warn('Poll interval too low, using minimum of 10 seconds');
            config.pollInterval = 10;
        }
        this.client = new OPNsenseClient({
            host: config.host,
            port: config.port || 443,
            apiKey: config.apiKey,
            apiSecret: config.apiSecret,
            sslVerify: config.sslVerify !== false,
            requestTimeout: config.requestTimeout || 10,
        }, (msg) => this.log.debug(msg));
        // Create static state objects
        await this.ensureChannel('system', 'System information');
        for (const [id, def] of Object.entries(systemStates)) {
            await this.ensureState(`system.${id}`, def);
        }
        for (const [id, def] of Object.entries(infoStates)) {
            await this.ensureState(`info.${id}`, def);
        }
        // Test connection
        try {
            await this.client.testConnection();
            await this.setState('info.connection', true, true);
            this.log.info(`Connected to OPNsense at ${config.host}:${config.port}`);
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            await this.setState('info.connection', false, true);
            this.log.error(`Cannot connect to OPNsense: ${msg}`);
            return;
        }
        // Interface names are extracted from statistics response keys
        // (get_interface_names has no ACL and is not accessible with restricted API users)
        // Initial poll
        await this.poll();
        // Start polling interval
        this.pollTimer = this.setInterval(() => {
            this.poll().catch((e) => {
                const msg = e instanceof Error ? e.message : String(e);
                this.log.error(`Polling failed: ${msg}`);
            });
        }, config.pollInterval * 1000);
        this.log.info(`Polling started with ${config.pollInterval}s interval`);
    }
    async poll() {
        if (!this.client) {
            return;
        }
        const results = await Promise.allSettled([
            this.client.getGatewayStatus(),
            this.client.getFirmwareInfo(),
            this.client.getFirmwareStatus(),
            this.client.getServices(),
            this.client.getInterfaceStatistics(),
            this.client.getArpTable(),
        ]);
        const [gateways, firmwareInfo, firmwareStatus, services, ifStats, arp] = results;
        let anySuccess = false;
        if (gateways.status === 'fulfilled') {
            anySuccess = await this.safeUpdate('gateways', () => this.updateGateways(gateways.value)) || anySuccess;
        }
        else {
            this.log.debug(`Gateway status failed: ${gateways.reason}`);
        }
        if (firmwareInfo.status === 'fulfilled') {
            anySuccess = await this.safeUpdate('firmware info', () => this.updateFirmwareInfo(firmwareInfo.value)) || anySuccess;
        }
        else {
            this.log.debug(`Firmware info failed: ${firmwareInfo.reason}`);
        }
        if (firmwareStatus.status === 'fulfilled') {
            anySuccess = await this.safeUpdate('firmware status', () => this.updateFirmwareStatus(firmwareStatus.value)) || anySuccess;
        }
        else {
            this.log.debug(`Firmware status failed: ${firmwareStatus.reason}`);
        }
        if (services.status === 'fulfilled') {
            anySuccess = await this.safeUpdate('services', () => this.updateServices(services.value)) || anySuccess;
        }
        else {
            this.log.debug(`Services failed: ${services.reason}`);
        }
        if (ifStats.status === 'fulfilled') {
            anySuccess = await this.safeUpdate('interface statistics', () => this.updateInterfaceStatistics(ifStats.value)) || anySuccess;
        }
        else {
            this.log.debug(`Interface statistics failed: ${ifStats.reason}`);
        }
        if (arp.status === 'fulfilled') {
            anySuccess = await this.safeUpdate('ARP table', () => this.updateArpTable(arp.value)) || anySuccess;
        }
        else {
            this.log.debug(`ARP table failed: ${arp.reason}`);
        }
        await this.setState('info.connection', anySuccess, true);
        if (anySuccess) {
            await this.setState('info.lastUpdate', Date.now(), true);
        }
    }
    async safeUpdate(name, fn) {
        try {
            await fn();
            return true;
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            this.log.error(`Error updating ${name}: ${msg}`);
            return false;
        }
    }
    // --- Update methods ---
    async updateGateways(data) {
        const items = data.items || [];
        this.log.debug(`Gateways: ${items.length} items found`);
        if (items.length === 0) {
            this.log.debug(`Gateways raw data: ${JSON.stringify(data).substring(0, 500)}`);
        }
        for (const gw of items) {
            this.log.debug(`Gateway "${gw.name}": status=${gw.status}, loss=${gw.loss}, delay=${gw.delay}, address=${gw.address}`);
            const id = this.sanitizeId(gw.name);
            const channelId = `gateways.${id}`;
            await this.ensureChannel(channelId, gw.name);
            for (const [stateId, def] of Object.entries(gatewayStates)) {
                await this.ensureState(`${channelId}.${stateId}`, def);
            }
            await this.setState(`${channelId}.address`, gw.address || '', true);
            await this.setState(`${channelId}.status`, gw.status_translated || gw.status || '', true);
            await this.setState(`${channelId}.online`, gw.status === 'none', true);
            await this.setState(`${channelId}.loss`, this.parseNumber(gw.loss), true);
            await this.setState(`${channelId}.delay`, this.parseNumber(gw.delay), true);
            await this.setState(`${channelId}.stddev`, this.parseNumber(gw.stddev), true);
        }
    }
    async updateFirmwareInfo(data) {
        this.log.debug(`Firmware: version=${data.product_version}, name=${data.product_name}, arch=${data.product_arch}`);
        await this.setState('system.firmwareVersion', data.product_version || '', true);
        await this.setState('system.productName', data.product_name || '', true);
        await this.setState('system.productArch', data.product_arch || '', true);
    }
    async updateFirmwareStatus(data) {
        this.log.debug(`Firmware status: updates=${data.updates}, needs_reboot=${data.needs_reboot}, status=${data.status}, status_msg=${data.status_msg}`);
        await this.setState('system.updateAvailable', (data.updates || 0) > 0, true);
        await this.setState('system.updateCount', data.updates || 0, true);
        await this.setState('system.needsReboot', data.needs_reboot === '1', true);
    }
    async updateServices(data) {
        const rows = data.rows || [];
        this.log.debug(`Services: ${rows.length} services found (total=${data.total}, rowCount=${data.rowCount})`);
        if (rows.length === 0) {
            this.log.debug(`Services raw data: ${JSON.stringify(data).substring(0, 500)}`);
        }
        for (const svc of rows) {
            this.log.debug(`Service "${svc.name}": running=${svc.running}, locked=${svc.locked}, desc="${svc.description}"`);
            const id = this.sanitizeId(svc.name);
            const channelId = `services.${id}`;
            await this.ensureChannel(channelId, svc.description || svc.name);
            for (const [stateId, def] of Object.entries(serviceStates)) {
                await this.ensureState(`${channelId}.${stateId}`, def);
            }
            await this.setState(`${channelId}.running`, svc.running === 1, true);
            await this.setState(`${channelId}.description`, svc.description || '', true);
        }
    }
    async updateInterfaceStatistics(data) {
        // The API may return statistics as an object (keyed by interface) or as an array
        const rawStats = data.statistics;
        this.log.debug(`Interface statistics type: ${Array.isArray(rawStats) ? 'Array' : typeof rawStats}`);
        if (rawStats && typeof rawStats === 'object' && !Array.isArray(rawStats)) {
            const keys = Object.keys(rawStats);
            this.log.debug(`Interface statistics keys (${keys.length}): ${keys.join(', ')}`);
            if (keys.length > 0) {
                const firstKey = keys[0];
                const firstVal = rawStats[firstKey];
                this.log.debug(`Interface statistics first entry ["${firstKey}"]: ${JSON.stringify(firstVal).substring(0, 500)}`);
            }
        }
        let stats;
        if (Array.isArray(rawStats)) {
            stats = rawStats;
        }
        else if (rawStats && typeof rawStats === 'object') {
            // Keys are like "[LAN] (igc1) / 192.168.1.1", values contain { name: "igc1", ... }
            stats = Object.entries(rawStats).map(([displayKey, entry]) => {
                const node = typeof entry === 'object' && entry !== null ? entry : {};
                return { displayKey, ...node };
            });
        }
        else {
            this.log.debug(`Unexpected interface statistics format: ${JSON.stringify(data).substring(0, 200)}`);
            return;
        }
        const now = Date.now();
        this.log.debug(`Interface statistics: processing ${stats.length} entries`);
        for (const entry of stats) {
            // entry.name is the technical name (e.g. "igc1"), displayKey is "[LAN] (igc1) / 192.168.1.1"
            const technicalName = entry.name;
            const id = this.sanitizeId(technicalName);
            const channelId = `interfaces.${id}`;
            // Extract friendly name from display key: "[LAN] (igc1) / ..." -> "LAN"
            const displayKey = entry.displayKey || '';
            const friendlyMatch = displayKey.match(/^\[([^\]]+)\]/);
            const friendlyName = friendlyMatch ? friendlyMatch[1] : technicalName;
            this.log.debug(`Interface "${technicalName}" (${friendlyName}): received-bytes=${entry['received-bytes']}, sent-bytes=${entry['sent-bytes']}, received-packets=${entry['received-packets']}, sent-packets=${entry['sent-packets']}`);
            await this.ensureChannel(channelId, friendlyName);
            for (const [stateId, def] of Object.entries(interfaceStates)) {
                await this.ensureState(`${channelId}.${stateId}`, def);
            }
            // Traffic sub-channel
            await this.ensureChannel(`${channelId}.traffic`, 'Traffic');
            for (const [stateId, def] of Object.entries(interfaceTrafficStates)) {
                await this.ensureState(`${channelId}.traffic.${stateId}`, def);
            }
            // Statistics sub-channel
            await this.ensureChannel(`${channelId}.statistics`, 'Statistics');
            for (const [stateId, def] of Object.entries(interfaceStatisticsStates)) {
                await this.ensureState(`${channelId}.statistics.${stateId}`, def);
            }
            const bytesIn = this.parseIntSafe(entry['received-bytes']);
            const bytesOut = this.parseIntSafe(entry['sent-bytes']);
            this.log.debug(`Interface "${technicalName}" parsed: bytesIn=${bytesIn}, bytesOut=${bytesOut}`);
            // Calculate traffic speed (delta)
            const prev = this.previousTraffic.get(entry.name);
            if (prev && prev.timestamp > 0) {
                const timeDeltaSec = (now - prev.timestamp) / 1000;
                if (timeDeltaSec > 0) {
                    const bytesInPerSec = Math.max(0, (bytesIn - prev.bytesIn) / timeDeltaSec);
                    const bytesOutPerSec = Math.max(0, (bytesOut - prev.bytesOut) / timeDeltaSec);
                    this.log.debug(`Interface "${technicalName}" speed: ${Math.round(bytesInPerSec)} B/s in, ${Math.round(bytesOutPerSec)} B/s out (delta=${timeDeltaSec.toFixed(1)}s)`);
                    await this.setState(`${channelId}.traffic.bytesReceivedSpeed`, Math.round(bytesInPerSec), true);
                    await this.setState(`${channelId}.traffic.bytesTransmittedSpeed`, Math.round(bytesOutPerSec), true);
                    await this.setState(`${channelId}.traffic.bitsReceivedSpeed`, Math.round(bytesInPerSec * 8), true);
                    await this.setState(`${channelId}.traffic.bitsTransmittedSpeed`, Math.round(bytesOutPerSec * 8), true);
                }
            }
            this.previousTraffic.set(entry.name, {
                bytesIn,
                bytesOut,
                timestamp: now,
            });
            // Statistics
            await this.setState(`${channelId}.statistics.packetsIn`, this.parseIntSafe(entry['received-packets']), true);
            await this.setState(`${channelId}.statistics.packetsOut`, this.parseIntSafe(entry['sent-packets']), true);
            await this.setState(`${channelId}.statistics.errorsIn`, this.parseIntSafe(entry['received-errors']), true);
            await this.setState(`${channelId}.statistics.errorsOut`, this.parseIntSafe(entry['send-errors']), true);
        }
    }
    async updateArpTable(data) {
        const rows = data.rows || [];
        this.log.debug(`ARP table: ${rows.length} entries (total=${data.total}, rowCount=${data.rowCount})`);
        if (rows.length === 0) {
            this.log.debug(`ARP raw data: ${JSON.stringify(data).substring(0, 500)}`);
        }
        for (const entry of rows) {
            if (!entry.ip) {
                continue;
            }
            const id = this.sanitizeId(entry.ip);
            const channelId = `arp.${id}`;
            await this.ensureChannel(channelId, entry.hostname || entry.ip);
            for (const [stateId, def] of Object.entries(arpStates)) {
                await this.ensureState(`${channelId}.${stateId}`, def);
            }
            await this.setState(`${channelId}.ip`, entry.ip, true);
            await this.setState(`${channelId}.mac`, entry.mac || '', true);
            await this.setState(`${channelId}.interface`, entry.intf_description || entry.intf || '', true);
            await this.setState(`${channelId}.hostname`, entry.hostname || '', true);
            await this.setState(`${channelId}.manufacturer`, entry.manufacturer || '', true);
        }
    }
    // --- Helper methods ---
    async ensureChannel(id, name) {
        await this.setObjectNotExistsAsync(id, {
            type: 'channel',
            common: { name },
            native: {},
        });
    }
    async ensureState(id, def) {
        const common = {
            name: def.name,
            type: def.type,
            role: def.role,
            read: def.read,
            write: def.write,
        };
        if (def.unit !== undefined) {
            common.unit = def.unit;
        }
        if (def.def !== undefined) {
            common.def = def.def;
        }
        await this.setObjectNotExistsAsync(id, {
            type: 'state',
            common,
            native: {},
        });
    }
    sanitizeId(name) {
        return name.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_{2,}/g, '_').replace(/^_|_$/g, '');
    }
    parseIntSafe(value) {
        if (typeof value === 'number') {
            return value;
        }
        if (typeof value === 'string') {
            const num = parseInt(value, 10);
            return isNaN(num) ? 0 : num;
        }
        return 0;
    }
    parseNumber(value) {
        if (!value) {
            return 0;
        }
        const num = parseFloat(value.replace(/[^0-9.-]/g, ''));
        return isNaN(num) ? 0 : Math.round(num * 100) / 100;
    }
    onUnload(callback) {
        try {
            if (this.pollTimer) {
                this.clearInterval(this.pollTimer);
                this.pollTimer = undefined;
            }
            this.client?.dispose();
            this.client = undefined;
            this.previousTraffic.clear();
        }
        catch {
            // ignore cleanup errors
        }
        callback();
    }
}
// ESM compact mode export
export default function startAdapter(options) {
    return new OPNsense(options);
}
// Standalone mode: start directly when run as main module
const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
if (isMain) {
    startAdapter(undefined);
}
//# sourceMappingURL=main.js.map