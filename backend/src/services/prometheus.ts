import fetch from 'node-fetch';

const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://localhost:9090';

export interface PrometheusMetric {
  metric: string;
  value: number;
  labels: Record<string, string>;
}

export interface ContainerMetric {
  name: string;
  cpu: number;
  memory: number;
  uptime: number;
}

export interface SystemMetrics {
  cpu: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  containers: ContainerMetric[];
  timestamp: string;
}

class PrometheusService {
  private baseUrl = PROMETHEUS_URL;

  async query(promQL: string): Promise<any> {
    try {
      const encodedQuery = encodeURIComponent(promQL);
      const response = await fetch(`${this.baseUrl}/api/v1/query?query=${encodedQuery}`, {
        timeout: 5000
      });
      if (!response.ok) {
        throw new Error(`Prometheus API error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error querying Prometheus:', error);
      return { status: 'error', data: { resultType: 'vector', result: [] } };
    }
  }

  async getCPUMetrics(): Promise<number> {
    try {
      // Get CPU usage rate over the last minute
      const result = await this.query('rate(process_cpu_seconds_total[1m])');
      if (result.status === 'success' && result.data.result.length > 0) {
        return parseFloat(result.data.result[0].value[1]);
      }
      return 0;
    } catch (error) {
      console.error('Error getting CPU metrics:', error);
      return 0;
    }
  }

  async getMemoryMetrics(): Promise<{ used: number; total: number; percentage: number }> {
    try {
      // Get process memory usage
      const result = await this.query('process_resident_memory_bytes');
      if (result.status === 'success' && result.data.result.length > 0) {
        const used = parseFloat(result.data.result[0].value[1]);
        
        // Get total system memory from node exporter
        const totalResult = await this.query('node_memory_MemTotal_bytes');
        const total = totalResult.status === 'success' && totalResult.data.result.length > 0
          ? parseFloat(totalResult.data.result[0].value[1])
          : used * 2; // Fallback estimate
        
        const percentage = total > 0 ? (used / total) * 100 : 0;
        
        return { used, total, percentage };
      }
      return { used: 0, total: 0, percentage: 0 };
    } catch (error) {
      console.error('Error getting memory metrics:', error);
      return { used: 0, total: 0, percentage: 0 };
    }
  }

  async getContainerMetrics(): Promise<ContainerMetric[]> {
    try {
      // Get process-level metrics that simulate container metrics
      const cpuResult = await this.query('rate(process_cpu_seconds_total[1m])');
      const memResult = await this.query('process_resident_memory_bytes');
      const uptimeResult = await this.query('process_start_time_seconds');
      
      const containers: ContainerMetric[] = [];
      
      // Use process metrics to create container-like metrics
      if (cpuResult.status === 'success' && cpuResult.data.result.length > 0) {
        for (const res of cpuResult.data.result) {
          const metric = res.metric || {};
          const name = metric.instance || 'default';
          const cpu = parseFloat(res.value[1]);
          
          // Find corresponding memory
          const memRes = memResult.data.result.find((m: any) => 
            (m.metric?.instance || 'default') === name
          );
          const memory = memRes ? parseFloat(memRes.value[1]) : 0;
          
          // Find uptime
          const uptimeRes = uptimeResult.data.result.find((m: any) => 
            (m.metric?.instance || 'default') === name
          );
          const startTime = uptimeRes ? parseFloat(uptimeRes.value[1]) : Date.now() / 1000;
          const uptime = Date.now() / 1000 - startTime;
          
          containers.push({ name, cpu, memory, uptime });
        }
      }
      
      // If no metrics found, provide default
      if (containers.length === 0) {
        containers.push({
          name: 'prometheus',
          cpu: 0,
          memory: 0,
          uptime: 0
        });
      }
      
      return containers;
    } catch (error) {
      console.error('Error getting container metrics:', error);
      return [];
    }
  }

  async getSystemMetrics(): Promise<SystemMetrics> {
    const cpu = await this.getCPUMetrics();
    const memory = await this.getMemoryMetrics();
    const containers = await this.getContainerMetrics();

    return {
      cpu,
      memory,
      containers,
      timestamp: new Date().toISOString()
    };
  }
}

export default new PrometheusService();
