// Test helper: a self-signed HTTPS (+ WebSocket) server on 127.0.0.1, standing in for the
// League client (LCU) or the Live Client Data API.
import https from 'node:https';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { WebSocketServer } from 'ws';
import { generate } from 'selfsigned';

let pems: Promise<{ private: string; cert: string }> | undefined;

export async function startFakeServer(
  handler: (req: IncomingMessage, res: ServerResponse) => void = (_req, res) =>
    res.writeHead(404).end(),
) {
  pems ??= generate([{ name: 'commonName', value: '127.0.0.1' }], { keySize: 2048 });
  const { private: key, cert } = await pems;
  const server = https.createServer({ key, cert }, handler);
  const wss = new WebSocketServer({ server });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    server,
    wss,
    port: (server.address() as AddressInfo).port,
    close: () =>
      new Promise<void>((resolve) => {
        for (const client of wss.clients) client.terminate();
        wss.close();
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}

export function sendJson(res: ServerResponse, body: unknown, status = 200): void {
  res.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(body));
}

/** Resolves once `predicate` is true, or rejects after `ms`. */
export async function waitFor(predicate: () => boolean, ms = 2000): Promise<void> {
  const deadline = Date.now() + ms;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error('waitFor timed out');
    await new Promise((r) => setTimeout(r, 10));
  }
}
