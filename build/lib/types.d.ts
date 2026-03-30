/** Adapter configuration from io-package.json native */
export interface OPNsenseAdapterConfig {
    host: string;
    port: number;
    apiKey: string;
    apiSecret: string;
    pollInterval: number;
    sslVerify: boolean;
    requestTimeout: number;
}
/** Configuration for the OPNsense API client */
export interface OPNsenseClientConfig {
    host: string;
    port: number;
    apiKey: string;
    apiSecret: string;
    sslVerify: boolean;
    requestTimeout: number;
}
export interface GatewayStatusItem {
    name: string;
    address: string;
    status: string;
    loss: string;
    delay: string;
    stddev: string;
    status_translated: string;
}
export interface GatewayStatusResponse {
    items: GatewayStatusItem[];
}
export interface InterfaceTrafficData {
    [interfaceName: string]: {
        bytes_received: number;
        bytes_transmitted: number;
        packets_received: number;
        packets_transmitted: number;
    };
}
export interface InterfaceTrafficResponse {
    interfaces: InterfaceTrafficData;
}
export interface InterfaceStatisticsEntry {
    name: string;
    'bytes received': string;
    'bytes transmitted': string;
    'packets received': string;
    'packets transmitted': string;
    'input errors': string;
    'output errors': string;
    collisions: string;
}
export interface InterfaceStatisticsResponse {
    statistics: InterfaceStatisticsEntry[];
}
export interface InterfaceNamesResponse {
    [technicalName: string]: string;
}
export interface FirmwareInfoResponse {
    product_id: string;
    product_version: string;
    product_name: string;
    product_arch: string;
    product_time: string;
    product_hash: string;
}
export interface FirmwareStatusResponse {
    status: string;
    status_msg: string;
    needs_reboot: string;
    upgrade_needs_reboot: string;
    last_check: string;
    updates: number;
    new_packages: unknown[];
    reinstall_packages: unknown[];
    remove_packages: unknown[];
    upgrade_packages: unknown[];
    downgrade_packages: unknown[];
}
export interface ServiceEntry {
    id: string;
    locked: number;
    running: number;
    description: string;
    name: string;
}
export interface ServicesResponse {
    rows: ServiceEntry[];
    rowCount: number;
    total: number;
    current: number;
}
export interface ArpEntry {
    mac: string;
    ip: string;
    intf: string;
    intf_description: string;
    manufacturer: string;
    hostname: string;
    expired: boolean;
    permanent: boolean;
    type: string;
}
export interface ArpResponse {
    rows: ArpEntry[];
    rowCount: number;
    total: number;
    current: number;
}
export interface TrafficSnapshot {
    bytesIn: number;
    bytesOut: number;
    timestamp: number;
}
//# sourceMappingURL=types.d.ts.map