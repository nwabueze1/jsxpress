import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { ServerAdapter, ServerHandle } from "./types.js";

function incomingToRequest(incoming: IncomingMessage): Request {
  const protocol = "http";
  const host = incoming.headers.host ?? "localhost";
  const url = new URL(incoming.url ?? "/", `${protocol}://${host}`);

  const headers = new Headers();
  for (const [key, value] of Object.entries(incoming.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) headers.append(key, v);
    } else {
      headers.set(key, value);
    }
  }

  const method = incoming.method ?? "GET";
  const hasBody = method !== "GET" && method !== "HEAD";

  let body: ReadableStream<Uint8Array> | null = null;
  if (hasBody) {
    body = new ReadableStream({
      start(controller) {
        incoming.on("data", (chunk: Buffer) => {
          controller.enqueue(new Uint8Array(chunk));
        });
        incoming.on("end", () => controller.close());
        incoming.on("error", (err) => controller.error(err));
      },
    });
  }

  return new Request(url, { method, headers, body, duplex: "half" } as any);
}

async function writeResponse(res: ServerResponse, response: Response): Promise<void> {
  const headerRecord: Record<string, string> = {};
  response.headers.forEach((value, key) => { headerRecord[key] = value; });
  res.writeHead(response.status, headerRecord);
  if (response.body) {
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
  }
  res.end();
}

export class NodeAdapter implements ServerAdapter {
  async listen(
    handler: (req: Request) => Promise<Response>,
    port: number,
    hostname: string
  ): Promise<ServerHandle> {
    const server = createServer(async (incoming, res) => {
      try {
        const request = incomingToRequest(incoming);
        const response = await handler(request);
        await writeResponse(res, response);
      } catch {
        res.writeHead(500);
        res.end("Internal Server Error");
      }
    });

    return new Promise((resolve) => {
      server.listen(port, hostname, () => {
        const addr = server.address();
        const actualPort = typeof addr === "object" && addr ? addr.port : port;
        resolve({
          port: actualPort,
          hostname,
          close() {
            server.close();
          },
        });
      });
    });
  }
}
