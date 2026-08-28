import * as net from 'net';

export async function checkPort(host: string, port: number): Promise<{ host: string; port: number; open: boolean; error?: string }> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(3000);
    socket.on('connect', () => {
      socket.destroy();
      resolve({ host, port, open: true });
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve({ host, port, open: false, error: 'TIMEOUT' });
    });
    socket.on('error', (err) => {
      socket.destroy();
      resolve({ host, port, open: false, error: err.message });
    });
    socket.connect(port, host);
  });
}

async function runTest() {
  const hosts = ['smtp.gmail.com', 'smtp-relay.gmail.com', 'aspmx.l.google.com'];
  const ports = [25, 465, 587, 2525];
  for (const h of hosts) {
    for (const p of ports) {
      const res = await checkPort(h, p);
      console.log(`${h}:${p} -> ${res.open ? 'OPEN' : 'CLOSED (' + res.error + ')'}`);
    }
  }
}

runTest().catch(console.error);
