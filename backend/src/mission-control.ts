import express, { Request, Response } from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import os from 'os';
import { exec as execSync } from 'child_process';
import { promisify } from 'util';
import Docker from 'dockerode';

const execAsync = promisify(execSync);

const app = express();
const docker = new Docker();

// CORS - Allow all origins for public dashboard
app.use(cors());
app.use(express.json());

// Cache for OpenClaw data
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache: Map<string, CacheEntry<any>> = new Map();
const CACHE_TTL = 8000; // 8 seconds cache

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data as T;
  }
  return null;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// Execute OpenClaw command and parse JSON
async function runOpenClawCommand(args: string[]): Promise<any> {
  try {
    const { stdout } = await execAsync(`openclaw ${args.join(' ')}`, { timeout: 10000 });
    return stdout;
  } catch (error: any) {
    console.error(`OpenClaw command failed: ${args.join(' ')}`, error.message);
    return null;
  }
}

// Get OpenClaw status with caching
async function getOpenClawStatus() {
  const cached = getCached('status');
  if (cached) return cached;
  
  const output = await runOpenClawCommand(['status', '--json']);
  if (output) {
    try {
      const data = JSON.parse(output);
      setCache('status', data);
      return data;
    } catch {
      return null;
    }
  }
  return null;
}

// Get OpenClaw sessions with caching
async function getOpenClawSessions() {
  const cached = getCached('sessions');
  if (cached) return cached;
  
  const output = await runOpenClawCommand(['sessions']);
  if (output) {
    try {
      const data = JSON.parse(output);
      setCache('sessions', data);
      return data;
    } catch {
      return null;
    }
  }
  return null;
}

// Get OpenClaw agents with caching
async function getOpenClawAgents() {
  const cached = getCached('agents');
  if (cached) return cached;
  
  const output = await runOpenClawCommand(['agents', 'list']);
  if (output) {
    try {
      // Parse the text output to extract agent info
      const agents = parseAgentsList(output);
      setCache('agents', agents);
      return agents;
    } catch {
      return null;
    }
  }
  return null;
}

// Parse agents list output
function parseAgentsList(output: string): any[] {
  const agents: any[] = [];
  const lines = output.split('\n');
  let currentAgent: any = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ') && !trimmed.includes(':')) {
      const agentId = trimmed.replace('- ', '').replace(' (default)', '').trim();
      currentAgent = { id: agentId, isDefault: trimmed.includes('(default)') };
    } else if (currentAgent && trimmed.startsWith('Workspace:')) {
      currentAgent.workspace = trimmed.replace('Workspace:', '').trim();
    } else if (currentAgent && trimmed.startsWith('Model:')) {
      currentAgent.model = trimmed.replace('Model:', '').trim();
    } else if (currentAgent && trimmed.length === 0 && Object.keys(currentAgent).length > 1) {
      agents.push(currentAgent);
      currentAgent = null;
    }
  }
  if (currentAgent && Object.keys(currentAgent).length > 1) {
    agents.push(currentAgent);
  }
  
  return agents;
}

// Get cron jobs
async function getCronJobs() {
  const cached = getCached('cron');
  if (cached) return cached;
  
  const output = await runOpenClawCommand(['cron', 'list']);
  // Returns "No cron jobs." if none exist
  const data = output?.includes('No cron jobs') ? [] : output;
  setCache('cron', data);
  return data;
}

// Get system metrics
function getSystemMetrics() {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  
  // Calculate CPU usage
  let totalIdle = 0;
  let totalTick = 0;
  for (const cpu of cpus) {
    for (const type in cpu.times) {
      totalTick += cpu.times[type as keyof typeof cpu.times];
    }
    totalIdle += cpu.times.idle;
  }
  const cpuUsage = 100 - (100 * totalIdle / totalTick);
  
  return {
    cpu: {
      cores: cpus.length,
      usage: Math.round(cpuUsage * 100) / 100,
      model: cpus[0]?.model || 'Unknown'
    },
    memory: {
      total: totalMem,
      used: usedMem,
      free: freeMem,
      usagePercent: Math.round((usedMem / totalMem) * 10000) / 100
    },
    os: {
      platform: os.platform(),
      release: os.release(),
      type: os.type(),
      hostname: os.hostname()
    },
    loadavg: os.loadavg(),
    uptime: os.uptime()
  };
}

// Get disk usage
async function getDiskUsage() {
  try {
    const { statfsSync } = await import('fs');
    // Get root filesystem stats
    const stats = statfsSync('/');
    const total = stats.bsize * stats.blocks;
    const free = stats.bsize * stats.bfree;
    const used = total - free;
    
    return {
      total,
      used,
      free,
      usagePercent: Math.round((used / total) * 10000) / 100
    };
  } catch (error) {
    console.error('Failed to get disk usage:', error);
    return null;
  }
}

// Get Docker containers
async function getDockerContainers() {
  try {
    const containers = await docker.listContainers({ all: true });
    return containers.map(container => ({
      id: container.Id,
      names: container.Names,
      image: container.Image,
      state: container.State,
      status: container.Status,
      ports: container.Ports,
      created: container.Created
    }));
  } catch (error) {
    console.error('Failed to get Docker containers:', error);
    return [];
  }
}

// Get Docker stats
async function getDockerStats() {
  try {
    const containers = await docker.listContainers();
    const stats: any[] = [];
    
    for (const container of containers) {
      try {
        const statsStream = await docker.getContainer(container.Id).stats({ stream: false });
        const cpuDelta = statsStream.cpu_stats.cpu_usage.total_usage - statsStream.precpu_stats.cpu_usage.total_usage;
        const systemDelta = statsStream.cpu_stats.system_cpu_usage - statsStream.precpu_stats.system_cpu_usage;
        const cpuPercent = systemDelta > 0 ? (cpuDelta / systemDelta) * (statsStream.cpu_stats.online_cpus || 1) * 100 : 0;
        
        const memUsage = statsStream.memory_stats.usage || 0;
        const memLimit = statsStream.memory_stats.limit || 1;
        const memPercent = (memUsage / memLimit) * 100;
        
        stats.push({
          id: container.Id,
          name: container.Names[0]?.replace('/', ''),
          cpu: Math.round(cpuPercent * 100) / 100,
          memory: {
            usage: memUsage,
            limit: memLimit,
            percent: Math.round(memPercent * 100) / 100
          },
          networkRx: statsStream.networks ? Object.values(statsStream.networks).reduce((acc: number, net: any) => acc + (net.rx_bytes || 0), 0) : 0,
          networkTx: statsStream.networks ? Object.values(statsStream.networks).reduce((acc: number, net: any) => acc + (net.tx_bytes || 0), 0) : 0
        });
      } catch {
        // Container might have stopped
      }
    }
    
    return stats;
  } catch (error) {
    console.error('Failed to get Docker stats:', error);
    return [];
  }
}

// ============ API Endpoints ============

// GET /api/status - Gateway status
app.get('/api/status', async (req: Request, res: Response) => {
  try {
    const status = await getOpenClawStatus();
    if (!status) {
      return res.status(500).json({ error: 'Failed to get OpenClaw status' });
    }
    
    const gateway = status.gateway || {};
    const agents = status.agents || {};
    const sessions = status.sessions || {};
    
    res.json({
      gateway: {
        mode: gateway.mode,
        url: gateway.url,
        reachable: gateway.reachable,
        connectLatencyMs: gateway.connectLatencyMs,
        self: gateway.self
      },
      agents: {
        total: agents.agents?.length || 0,
        defaultId: agents.defaultId,
        bootstrapPendingCount: agents.bootstrapPendingCount
      },
      sessions: {
        count: sessions.count,
        defaults: sessions.defaults
      },
      os: status.os,
      memory: status.memory,
      securityAudit: status.securityAudit
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/sessions - Active sessions
app.get('/api/sessions', async (req: Request, res: Response) => {
  try {
    const status = await getOpenClawStatus();
    if (!status) {
      return res.status(500).json({ error: 'Failed to get sessions' });
    }
    
    const sessions = status.sessions || {};
    res.json({
      count: sessions.count,
      defaults: sessions.defaults,
      recent: sessions.recent || [],
      byAgent: sessions.byAgent || []
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/agents - Agent list
app.get('/api/agents', async (req: Request, res: Response) => {
  try {
    const status = await getOpenClawStatus();
    if (!status) {
      return res.status(500).json({ error: 'Failed to get agents' });
    }
    
    const agents = status.agents?.agents || [];
    res.json(agents);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/metrics - System metrics
app.get('/api/metrics', async (req: Request, res: Response) => {
  try {
    const metrics = getSystemMetrics();
    const disk = await getDiskUsage();
    const dockerStats = await getDockerStats();
    
    res.json({
      system: metrics,
      disk,
      docker: dockerStats
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/containers - Docker containers
app.get('/api/containers', async (req: Request, res: Response) => {
  try {
    const containers = await getDockerContainers();
    res.json(containers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/cron - Scheduled jobs
app.get('/api/cron', async (req: Request, res: Response) => {
  try {
    const status = await getOpenClawStatus();
    if (!status) {
      return res.status(500).json({ error: 'Failed to get cron info' });
    }
    
    // Get heartbeat config as proxy for cron info
    const heartbeat = status.heartbeat || {};
    res.json({
      agents: heartbeat.agents || []
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'mission-control' });
});

// ============ WebSocket Server ============
const PORT = parseInt(process.env.PORT || '3002', 10);
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Track connected clients
const clients: Set<WebSocket> = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('WebSocket client connected. Total clients:', clients.size);
  
  // Send initial data
  sendUpdate(ws);
  
  ws.on('close', () => {
    clients.delete(ws);
    console.log('WebSocket client disconnected. Total clients:', clients.size);
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });
});

// Send update to specific client
async function sendUpdate(ws: WebSocket) {
  if (ws.readyState !== WebSocket.OPEN) return;
  
  try {
    const [status, metrics, containers] = await Promise.all([
      getOpenClawStatus(),
      Promise.resolve(getSystemMetrics()).then(async m => {
        const disk = await getDiskUsage();
        const dockerStats = await getDockerStats();
        return { system: m, disk, docker: dockerStats };
      }),
      getDockerContainers()
    ]);
    
    ws.send(JSON.stringify({
      type: 'status_update',
      timestamp: Date.now(),
      data: {
        gateway: status?.gateway,
        agents: status?.agents,
        sessions: status?.sessions
      }
    }));
    
    ws.send(JSON.stringify({
      type: 'metrics_update',
      timestamp: Date.now(),
      data: metrics
    }));
    
    ws.send(JSON.stringify({
      type: 'container_update',
      timestamp: Date.now(),
      data: containers
    }));
  } catch (error) {
    console.error('Failed to send update:', error);
  }
}

// Push updates every 5 seconds
setInterval(() => {
  if (clients.size === 0) return;
  
  Promise.all([
    getOpenClawStatus(),
    Promise.resolve(getSystemMetrics()).then(async m => {
      const disk = await getDiskUsage();
      const dockerStats = await getDockerStats();
      return { system: m, disk, docker: dockerStats };
    }),
    getDockerContainers()
  ]).then(([status, metrics, containers]) => {
    const timestamp = Date.now();
    
    // Broadcast status update
    broadcast({
      type: 'status_update',
      timestamp,
      data: {
        gateway: status?.gateway,
        agents: status?.agents,
        sessions: status?.sessions
      }
    });
    
    // Broadcast metrics update
    broadcast({
      type: 'metrics_update',
      timestamp,
      data: metrics
    });
    
    // Broadcast container update
    broadcast({
      type: 'container_update',
      timestamp,
      data: containers
    });
  }).catch(error => {
    console.error('Failed to broadcast updates:', error);
  });
}, 5000);

function broadcast(message: any) {
  const data = JSON.stringify(message);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Mission Control API running on port ${PORT}`);
  console.log(`WebSocket server running on ws://0.0.0.0:${PORT}/ws`);
});
