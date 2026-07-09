import http from 'node:http';
import https from 'node:https';
import fetch from 'node-fetch';

const connectTimeoutMs = Number(process.env.CERBANIMO_EVIDENCE_FETCH_CONNECT_TIMEOUT_MS || 5000);

class EvidenceHttpTransport {
  pinnedAgent(parsed, pinnedAddress) {
    const lookup = (_hostname, _options, callback) => {
      callback(null, pinnedAddress.address, pinnedAddress.family);
    };
    const Agent = parsed.protocol === 'https:' ? https.Agent : http.Agent;
    return new Agent({
      lookup,
      timeout: connectTimeoutMs,
      servername: parsed.hostname
    });
  }

  async get(parsed, { pinnedAddress, signal, fetchImpl = fetch } = {}) {
    const agent = this.pinnedAgent(parsed, pinnedAddress);
    return fetchImpl(parsed.toString(), {
      method: 'GET',
      redirect: 'manual',
      headers: {
        'user-agent': 'CerbanimoEvidenceFetcher/1.0',
        host: parsed.host
      },
      agent,
      signal
    });
  }
}

export default new EvidenceHttpTransport();
