import https from 'node:https';

// LCU and Live Client use self-signed certs. This agent skips verification, so it must only
// ever be used for 127.0.0.1; it is never installed globally.
export const localAgent = new https.Agent({ rejectUnauthorized: false });

/** GET JSON from a local Riot endpoint (LCU or Live Client). Refuses any non-loopback host. */
export function localGetJson<T>(url: string, authorization?: string): Promise<T> {
  const target = new URL(url);
  if (target.hostname !== '127.0.0.1')
    return Promise.reject(new Error(`Refusing non-local URL ${url}`));
  return new Promise<T>((resolve, reject) => {
    const req = https.get(
      target,
      {
        agent: localAgent,
        timeout: 3000,
        headers: authorization ? { Authorization: authorization } : {},
      },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => (body += chunk));
        res.on('end', () => {
          if (res.statusCode !== 200)
            return reject(new Error(`${res.statusCode} from ${target.pathname}`));
          try {
            resolve(JSON.parse(body) as T);
          } catch (err) {
            reject(err);
          }
        });
      },
    );
    req.on('timeout', () => req.destroy(new Error(`Timeout for ${target.pathname}`)));
    req.on('error', reject);
  });
}
