import * as https from 'node:https';
import * as http from 'node:http';
import type {
    OPNsenseClientConfig,
    GatewayStatusResponse,
    InterfaceTrafficResponse,
    InterfaceStatisticsResponse,
    InterfaceNamesResponse,
    FirmwareInfoResponse,
    FirmwareStatusResponse,
    ServicesResponse,
    ArpResponse,
} from './types.js';

type LogFunction = (msg: string) => void;

export class OPNsenseClient {
    private readonly baseUrl: string;
    private readonly authHeader: string;
    private readonly agent: https.Agent | http.Agent;
    private readonly timeoutMs: number;
    private readonly useHttps: boolean;
    private readonly logDebug: LogFunction;

    constructor(
        private readonly config: OPNsenseClientConfig,
        logDebug?: LogFunction,
    ) {
        this.useHttps = config.port === 443 || config.port !== 80;
        const protocol = this.useHttps ? 'https' : 'http';
        this.baseUrl = `${protocol}://${config.host}:${config.port}`;
        this.authHeader = `Basic ${Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64')}`;
        this.timeoutMs = config.requestTimeout * 1000;
        this.logDebug = logDebug || (() => {});

        if (this.useHttps) {
            this.agent = new https.Agent({
                rejectUnauthorized: config.sslVerify,
                keepAlive: true,
            });
        } else {
            this.agent = new http.Agent({
                keepAlive: true,
            });
        }
    }

    private request<T>(method: 'GET' | 'POST', path: string): Promise<T> {
        return new Promise((resolve, reject) => {
            const url = new URL(path, this.baseUrl);
            const mod = this.useHttps ? https : http;
            const startTime = Date.now();

            this.logDebug(`API ${method} ${path} ...`);

            const req = mod.request(
                url,
                {
                    method,
                    agent: this.agent,
                    headers: {
                        Authorization: this.authHeader,
                        Accept: 'application/json',
                        ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
                    },
                    timeout: this.timeoutMs,
                },
                (res) => {
                    const chunks: Buffer[] = [];
                    res.on('data', (chunk: Buffer) => chunks.push(chunk));
                    res.on('end', () => {
                        const body = Buffer.concat(chunks).toString('utf-8');
                        const elapsed = Date.now() - startTime;

                        this.logDebug(`API ${method} ${path} -> ${res.statusCode} (${elapsed}ms, ${body.length} bytes)`);

                        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
                            this.logDebug(`API ${method} ${path} error body: ${body.substring(0, 500)}`);
                            reject(new Error(`HTTP ${res.statusCode}: ${body.substring(0, 200)}`));
                            return;
                        }

                        try {
                            const data = JSON.parse(body) as T;
                            // Log the top-level keys and structure of the response
                            if (typeof data === 'object' && data !== null) {
                                const keys = Object.keys(data);
                                this.logDebug(
                                    `API ${path} response keys: [${keys.join(', ')}]`,
                                );
                                // Log structure details for each top-level key
                                for (const key of keys) {
                                    const val = (data as Record<string, unknown>)[key];
                                    if (Array.isArray(val)) {
                                        this.logDebug(`  ${key}: Array[${val.length}]${val.length > 0 ? ` first=${JSON.stringify(val[0]).substring(0, 300)}` : ''}`);
                                    } else if (typeof val === 'object' && val !== null) {
                                        const subKeys = Object.keys(val);
                                        this.logDebug(`  ${key}: Object{${subKeys.length} keys}${subKeys.length > 0 ? ` keys=[${subKeys.slice(0, 5).join(', ')}${subKeys.length > 5 ? '...' : ''}]` : ''}`);
                                        // Log first entry details
                                        if (subKeys.length > 0) {
                                            const firstVal = (val as Record<string, unknown>)[subKeys[0]];
                                            this.logDebug(`  ${key}["${subKeys[0]}"] = ${JSON.stringify(firstVal).substring(0, 400)}`);
                                        }
                                    } else {
                                        this.logDebug(`  ${key}: ${typeof val} = ${JSON.stringify(val).substring(0, 200)}`);
                                    }
                                }
                            }
                            resolve(data);
                        } catch {
                            this.logDebug(`API ${path} invalid JSON: ${body.substring(0, 300)}`);
                            reject(new Error(`Invalid JSON response from ${path}`));
                        }
                    });
                    res.on('error', reject);
                },
            );

            req.on('timeout', () => {
                req.destroy();
                reject(new Error(`Request timeout after ${this.config.requestTimeout}s for ${path}`));
            });

            req.on('error', (err: Error) => {
                if (err.message.includes('self-signed') || err.message.includes('self signed')) {
                    reject(
                        new Error(
                            `SSL certificate error: ${err.message}. If using a self-signed certificate, disable SSL verification in the adapter settings.`,
                        ),
                    );
                } else {
                    reject(err);
                }
            });

            if (method === 'POST') {
                req.write('{}');
            }
            req.end();
        });
    }

    async testConnection(): Promise<boolean> {
        await this.request<FirmwareInfoResponse>('GET', '/api/core/firmware/info');
        return true;
    }

    async getGatewayStatus(): Promise<GatewayStatusResponse> {
        return this.request<GatewayStatusResponse>('GET', '/api/routes/gateway/status');
    }

    async getInterfaceTraffic(): Promise<InterfaceTrafficResponse> {
        return this.request<InterfaceTrafficResponse>('GET', '/api/diagnostics/traffic/interface');
    }

    async getInterfaceStatistics(): Promise<InterfaceStatisticsResponse> {
        return this.request<InterfaceStatisticsResponse>(
            'GET',
            '/api/diagnostics/interface/get_interface_statistics',
        );
    }

    async getInterfaceNames(): Promise<InterfaceNamesResponse> {
        return this.request<InterfaceNamesResponse>(
            'GET',
            '/api/diagnostics/interface/get_interface_names',
        );
    }

    async getFirmwareInfo(): Promise<FirmwareInfoResponse> {
        return this.request<FirmwareInfoResponse>('GET', '/api/core/firmware/info');
    }

    async getFirmwareStatus(): Promise<FirmwareStatusResponse> {
        return this.request<FirmwareStatusResponse>('POST', '/api/core/firmware/status');
    }

    async getServices(): Promise<ServicesResponse> {
        return this.request<ServicesResponse>('GET', '/api/core/service/search');
    }

    async getArpTable(): Promise<ArpResponse> {
        return this.request<ArpResponse>('GET', '/api/diagnostics/interface/search_arp');
    }

    dispose(): void {
        this.agent.destroy();
    }
}
