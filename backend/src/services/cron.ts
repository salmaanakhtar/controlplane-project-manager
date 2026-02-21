import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface CronJob {
  id: string;
  name: string;
  schedule: string;
  enabled: boolean;
  agentId?: string;
  lastRun?: string;
  nextRun?: string;
}

export interface CronRun {
  id: string;
  jobId: string;
  startTime: string;
  endTime?: string;
  status: 'running' | 'success' | 'failed' | 'cancelled';
  error?: string;
}

class CronService {
  async getJobs(includeAll: boolean = false): Promise<CronJob[]> {
    try {
      let cmd = 'openclaw cron list --json';
      if (includeAll) {
        cmd += ' --all';
      }
      
      const { stdout } = await execAsync(cmd, { timeout: 15000 });
      const result = JSON.parse(stdout);
      
      return result.jobs || [];
    } catch (error) {
      console.error('Error fetching cron jobs:', error);
      return [];
    }
  }

  async getCronRuns(limit: number = 20): Promise<CronRun[]> {
    try {
      const { stdout } = await execAsync(
        `openclaw cron runs --json --limit ${limit}`,
        { timeout: 10000 }
      );
      const runs = stdout.trim().split('\n').filter(Boolean);
      return runs.map(line => JSON.parse(line));
    } catch (error) {
      console.error('Error fetching cron runs:', error);
      return [];
    }
  }

  async getCronStatus(): Promise<{ running: boolean; jobs: number; nextRun?: string }> {
    try {
      const { stdout } = await execAsync('openclaw cron status --json', { timeout: 10000 });
      const result = JSON.parse(stdout);
      return result;
    } catch (error) {
      console.error('Error fetching cron status:', error);
      return { running: false, jobs: 0 };
    }
  }
}

export default new CronService();
