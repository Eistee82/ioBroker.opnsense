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

export class OPNsenseClient {
    private readonly baseUrl: string;
    private readonly authHeader: string;
    private readonly agent: https.Agent | http.Agent;
    private readonly timeoutMs: number;
    private readonly useHttps: boolean;

    constructor(private readonly config: OPNsenseClientConfig) {
        this.useHttps = config.port === 443 || config.port !== 80;
        const protocol = this.useHttps ? 'https' : 'http';
        this.baseUrl = `${protocol}://${config.host}:${config.port}`;
        this.authHeader = `Basic ${Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64')}`;
        this.timeoutMs = config.requestTimeout * 1000;

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

                        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
                            reject(new Error(`HTTP ${res.statusCode}: ${body.substring(0, 200)}`));
                            return;
                        }

                        try {
                            const data = JSON.parse(body) as T;
                            resolve(data);
                        } catch {
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
