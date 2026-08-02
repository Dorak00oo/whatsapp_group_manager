import net from "node:net";
import { Client } from "ssh2";

/**
 * @param {{
 *   host: string;
 *   user: string;
 *   password: string;
 *   remoteHost: string;
 *   remotePort: number;
 *   localPort: number;
 * }} options
 */
export function startHomelabTunnel(options) {
  const { host, user, password, remoteHost, remotePort, localPort } = options;

  return new Promise((resolve, reject) => {
    const conn = new Client();

    conn.on("ready", () => {
      const server = net.createServer((sock) => {
        conn.forwardOut(
          sock.remoteAddress ?? "127.0.0.1",
          sock.remotePort ?? 0,
          remoteHost,
          remotePort,
          (err, stream) => {
            if (err) {
              sock.destroy();
              return;
            }
            sock.pipe(stream).pipe(sock);
          },
        );
      });

      server.on("error", reject);
      server.listen(localPort, "127.0.0.1", () => {
        resolve({
          close() {
            server.close();
            conn.end();
          },
        });
      });
    });

    conn.on("error", reject);
    conn.connect({
      host,
      port: 22,
      username: user,
      password,
      readyTimeout: 20000,
    });
  });
}

/** @param {number} port */
export function isLocalPortOpen(port) {
  return new Promise((resolve) => {
    const socket = net.connect(port, "127.0.0.1");
    socket.once("connect", () => {
      socket.end();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}
