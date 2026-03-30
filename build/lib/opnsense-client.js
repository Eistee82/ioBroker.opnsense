import * as https from 'node:https';
import * as http from 'node:http';
export class OPNsenseClient {
    config;
    baseUrl;
    authHeader;
    agent;
    timeoutMs;
    useHttps;
    constructor(config) {
        this.config = config;
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
        }
        else {
            this.agent = new http.Agent({
                keepAlive: true,
            });
        }
    }
    request(method, path) {
        return new Promise((resolve, reject) => {
            const url = new URL(path, this.baseUrl);
            const mod = this.useHttps ? https : http;
            const req = mod.request(url, {
                method,
                agent: this.agent,
                headers: {
                    Authorization: this.authHeader,
                    Accept: 'application/json',
                    ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
                },
                timeout: this.timeoutMs,
            }, (res) => {
                const chunks = [];
                res.on('data', (chunk) => chunks.push(chunk));
                res.on('end', () => {
                    const body = Buffer.concat(chunks).toString('utf-8');
                    if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
                        reject(new Error(`HTTP ${res.statusCode}: ${body.substring(0, 200)}`));
                        return;
                    }
                    try {
                        const data = JSON.parse(body);
                        resolve(data);
                    }
                    catch {
                        reject(new Error(`Invalid JSON response from ${path}`));
                    }
                });
                res.on('error', reject);
            });
            req.on('timeout', () => {
                req.destroy();
                reject(new Error(`Request timeout after ${this.config.requestTimeout}s for ${path}`));
            });
            req.on('error', (err) => {
                if (err.message.includes('self-signed') || err.message.includes('self signed')) {
                    reject(new Error(`SSL certificate error: ${err.message}. If using a self-signed certificate, disable SSL verification in the adapter settings.`));
                }
                else {
                    reject(err);
                }
            });
            if (method === 'POST') {
                req.write('{}');
            }
            req.end();
        });
    }
    async testConnection() {
        await this.request('GET', '/api/core/firmware/info');
        return true;
    }
    async getGatewayStatus() {
        return this.request('GET', '/api/routes/gateway/status');
    }
    async getInterfaceTraffic() {
        return this.request('GET', '/api/diagnostics/traffic/interface');
    }
    async getInterfaceStatistics() {
        return this.request('GET', '/api/diagnostics/interface/get_interface_statistics');
    }
    async getInterfaceNames() {
        return this.request('GET', '/api/diagnostics/interface/get_interface_names');
    }
    async getFirmwareInfo() {
        return this.request('GET', '/api/core/firmware/info');
    }
    async getFirmwareStatus() {
        return this.request('POST', '/api/core/firmware/status');
    }
    async getServices() {
        return this.request('GET', '/api/core/service/search');
    }
    async getArpTable() {
        return this.request('GET', '/api/diagnostics/interface/search_arp');
    }
    dispose() {
        this.agent.destroy();
    }
}
//# sourceMappingURL=opnsense-client.js.map