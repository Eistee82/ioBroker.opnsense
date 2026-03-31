/** Central definition of all ioBroker state objects used by this adapter. */

export interface StateDefinition {
    type: ioBroker.CommonType;
    role: string;
    name: string;
    read: boolean;
    write: boolean;
    unit?: string;
    def?: ioBroker.StateValue;
}

// --- System States ---

export const systemStates: Record<string, StateDefinition> = {
    firmwareVersion: {
        type: 'string',
        role: 'text',
        name: 'Firmware version',
        read: true,
        write: false,
        def: '',
    },
    productName: {
        type: 'string',
        role: 'text',
        name: 'Product name',
        read: true,
        write: false,
        def: '',
    },
    productArch: {
        type: 'string',
        role: 'text',
        name: 'Architecture',
        read: true,
        write: false,
        def: '',
    },
    updateAvailable: {
        type: 'boolean',
        role: 'indicator',
        name: 'Firmware update available',
        read: true,
        write: false,
        def: false,
    },
    updateCount: {
        type: 'number',
        role: 'value',
        name: 'Number of available updates',
        read: true,
        write: false,
        def: 0,
    },
    needsReboot: {
        type: 'boolean',
        role: 'indicator',
        name: 'System needs reboot',
        read: true,
        write: false,
        def: false,
    },
};

// --- Gateway States ---

export const gatewayStates: Record<string, StateDefinition> = {
    address: {
        type: 'string',
        role: 'text',
        name: 'Gateway address',
        read: true,
        write: false,
        def: '',
    },
    status: {
        type: 'string',
        role: 'text',
        name: 'Gateway status',
        read: true,
        write: false,
        def: '',
    },
    online: {
        type: 'boolean',
        role: 'indicator.reachable',
        name: 'Gateway online',
        read: true,
        write: false,
        def: false,
    },
    loss: {
        type: 'number',
        role: 'value',
        name: 'Packet loss',
        read: true,
        write: false,
        unit: '%',
        def: 0,
    },
    delay: {
        type: 'number',
        role: 'value.time',
        name: 'Round-trip delay',
        read: true,
        write: false,
        unit: 'ms',
        def: 0,
    },
    stddev: {
        type: 'number',
        role: 'value',
        name: 'Delay standard deviation',
        read: true,
        write: false,
        unit: 'ms',
        def: 0,
    },
};

// --- Interface States ---

export const interfaceStates: Record<string, StateDefinition> = {
    status: {
        type: 'string',
        role: 'text',
        name: 'Interface status',
        read: true,
        write: false,
        def: '',
    },
    enabled: {
        type: 'boolean',
        role: 'indicator',
        name: 'Interface enabled',
        read: true,
        write: false,
        def: false,
    },
    macAddress: {
        type: 'string',
        role: 'text',
        name: 'MAC address',
        read: true,
        write: false,
        def: '',
    },
    mtu: {
        type: 'number',
        role: 'value',
        name: 'Maximum transmission unit',
        read: true,
        write: false,
        def: 0,
    },
};

export const interfaceTrafficStates: Record<string, StateDefinition> = {
    mbitsReceivedSpeed: {
        type: 'number',
        role: 'value',
        name: 'Receive speed',
        read: true,
        write: false,
        unit: 'Mbit/s',
        def: 0,
    },
    mbitsTransmittedSpeed: {
        type: 'number',
        role: 'value',
        name: 'Transmit speed',
        read: true,
        write: false,
        unit: 'Mbit/s',
        def: 0,
    },
};

export const interfaceStatisticsStates: Record<string, StateDefinition> = {
    packetsIn: {
        type: 'number',
        role: 'value',
        name: 'Packets received',
        read: true,
        write: false,
        def: 0,
    },
    packetsOut: {
        type: 'number',
        role: 'value',
        name: 'Packets transmitted',
        read: true,
        write: false,
        def: 0,
    },
    errorsIn: {
        type: 'number',
        role: 'value',
        name: 'Input errors',
        read: true,
        write: false,
        def: 0,
    },
    errorsOut: {
        type: 'number',
        role: 'value',
        name: 'Output errors',
        read: true,
        write: false,
        def: 0,
    },
};

// --- Service States ---

export const serviceStates: Record<string, StateDefinition> = {
    running: {
        type: 'boolean',
        role: 'indicator.working',
        name: 'Service running',
        read: true,
        write: false,
        def: false,
    },
    description: {
        type: 'string',
        role: 'text',
        name: 'Service description',
        read: true,
        write: false,
        def: '',
    },
};

// --- ARP States ---

export const arpStates: Record<string, StateDefinition> = {
    ip: {
        type: 'string',
        role: 'text',
        name: 'IP address',
        read: true,
        write: false,
        def: '',
    },
    mac: {
        type: 'string',
        role: 'text',
        name: 'MAC address',
        read: true,
        write: false,
        def: '',
    },
    interface: {
        type: 'string',
        role: 'text',
        name: 'Network interface',
        read: true,
        write: false,
        def: '',
    },
    hostname: {
        type: 'string',
        role: 'text',
        name: 'Hostname',
        read: true,
        write: false,
        def: '',
    },
    manufacturer: {
        type: 'string',
        role: 'text',
        name: 'Manufacturer',
        read: true,
        write: false,
        def: '',
    },
};

// --- Info States ---

export const infoStates: Record<string, StateDefinition> = {
    lastUpdate: {
        type: 'number',
        role: 'date.start',
        name: 'Last successful update',
        read: true,
        write: false,
        def: 0,
    },
};
