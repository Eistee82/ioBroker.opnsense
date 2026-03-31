import type { OPNsenseClientConfig, GatewayStatusResponse, InterfaceTrafficResponse, InterfaceStatisticsResponse, InterfaceNamesResponse, FirmwareInfoResponse, FirmwareStatusResponse, ServicesResponse, ArpResponse } from './types.js';
type LogFunction = (msg: string) => void;
export declare class OPNsenseClient {
    private readonly config;
    private readonly baseUrl;
    private readonly authHeader;
    private readonly agent;
    private readonly timeoutMs;
    private readonly useHttps;
    private readonly logDebug;
    constructor(config: OPNsenseClientConfig, logDebug?: LogFunction);
    private request;
    testConnection(): Promise<boolean>;
    getGatewayStatus(): Promise<GatewayStatusResponse>;
    getInterfaceTraffic(): Promise<InterfaceTrafficResponse>;
    getInterfaceStatistics(): Promise<InterfaceStatisticsResponse>;
    getInterfaceNames(): Promise<InterfaceNamesResponse>;
    getFirmwareInfo(): Promise<FirmwareInfoResponse>;
    getFirmwareStatus(): Promise<FirmwareStatusResponse>;
    getServices(): Promise<ServicesResponse>;
    getArpTable(): Promise<ArpResponse>;
    dispose(): void;
}
export {};
//# sourceMappingURL=opnsense-client.d.ts.map