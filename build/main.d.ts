import * as utils from '@iobroker/adapter-core';
declare class OPNsense extends utils.Adapter {
    private client;
    private pollTimer;
    private previousTraffic;
    private interfaceNames;
    constructor(options?: Partial<utils.AdapterOptions>);
    private onReady;
    private poll;
    private updateGateways;
    private updateFirmwareInfo;
    private updateFirmwareStatus;
    private updateServices;
    private updateInterfaceStatistics;
    private updateArpTable;
    private ensureChannel;
    private ensureState;
    private sanitizeId;
    private parseNumber;
    private onUnload;
}
export default function startAdapter(options: Partial<utils.AdapterOptions> | undefined): OPNsense;
export {};
//# sourceMappingURL=main.d.ts.map