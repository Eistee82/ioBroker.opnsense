import * as https from 'node:https';
import * as http from 'node:http';
export class OPNsenseClient {
    config;
    baseUrl;
    authHeader;
    agent;
    timeoutMs;
    useHttps;
    logDebug;
    constructor(config, logDebug) {
        this.config = config;
        this.useHttps = config.port === 443 || config.port !== 80;
        const protocol = this.useHttps ? 'https' : 'http';
        this.baseUrl = `${protocol}://${config.host}:${config.port}`;
        this.authHeader = `Basic ${Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64')}`;
        this.timeoutMs = config.requestTimeout * 1000;
        this.logDebug = logDebug || (() => { });
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
            const startTime = Date.now();
            this.logDebug(`API ${method} ${path} ...`);
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
                    const elapsed = Date.now() - startTime;
                    this.logDebug(`API ${method} ${path} -> ${res.statusCode} (${elapsed}ms, ${body.length} bytes)`);
                    if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
                        this.logDebug(`API ${method} ${path} error body: ${body.substring(0, 500)}`);
                        reject(new Error(`HTTP ${res.statusCode}: ${body.substring(0, 200)}`));
                        return;
                    }
                    try {
                        const data = JSON.parse(body);
                        // Log the top-level keys and structure of the response
                        if (typeof data === 'object' && data !== null) {
                            const keys = Object.keys(data);
                            this.logDebug(`API ${path} response keys: [${keys.join(', ')}]`);
                            // Log structure details for each top-level key
                            for (const key of keys) {
                                const val = data[key];
                                if (Array.isArray(val)) {
                                    this.logDebug(`  ${key}: Array[${val.length}]${val.length > 0 ? ` first=${JSON.stringify(val[0]).substring(0, 300)}` : ''}`);
                                }
                                else if (typeof val === 'object' && val !== null) {
                                    const subKeys = Object.keys(val);
                                    this.logDebug(`  ${key}: Object{${subKeys.length} keys}${subKeys.length > 0 ? ` keys=[${subKeys.slice(0, 5).join(', ')}${subKeys.length > 5 ? '...' : ''}]` : ''}`);
                                    // Log first entry details
                                    if (subKeys.length > 0) {
                                        const firstVal = val[subKeys[0]];
                                        this.logDebug(`  ${key}["${subKeys[0]}"] = ${JSON.stringify(firstVal).substring(0, 400)}`);
                                    }
                                }
                                else {
                                    this.logDebug(`  ${key}: ${typeof val} = ${JSON.stringify(val).substring(0, 200)}`);
                                }
                            }
                        }
                        resolve(data);
                    }
                    catch {
                        this.logDebug(`API ${path} invalid JSON: ${body.substring(0, 300)}`);
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