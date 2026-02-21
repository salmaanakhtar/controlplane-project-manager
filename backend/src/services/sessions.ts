import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface Session {
  key: string;
  kind: string;
  updatedAt: number;
  ageMs: number;
  sessionId: string;
  systemSent: boolean;
  abortedLastRun: boolean;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  model?: string;
  modelProvider?: string;
  contextTokens?: number;
}

export interface SessionsResponse {
  path: string;
  count: number;
  activeMinutes: number | null;
  sessions: Session[];
}

class SessionsService {
  async getSessions(activeMinutes?: number): Promise<SessionsResponse> {
    try {
      let cmd = 'openclaw sessions --json';
      if (activeMinutes) {
        cmd += ` --active ${activeMinutes}`;
      }
      
      const { stdout } = await execAsync(cmd, { timeout: 10000 });
      const result = JSON.parse(stdout);
      
      // Transform sessions to include computed fields
      return {
        path: result.path,
        count: result.count,
        activeMinutes: result.activeMinutes,
        sessions: result.sessions.map((s: any) => ({
          key: s.key,
          kind: s.kind,
          updatedAt: s.updatedAt,
          ageMs: s.ageMs,
          sessionId: s.sessionId,
          systemSent: s.systemSent,
          abortedLastRun: s.abortedLastRun,
          inputTokens: s.inputTokens,
          outputTokens: s.outputTokens,
          totalTokens: s.totalTokens,
          model: s.model,
          modelProvider: s.modelProvider,
          contextTokens: s.contextTokens
        }))
      };
    } catch (error) {
      console.error('Error fetching sessions:', error);
      return {
        path: '',
        count: 0,
        activeMinutes: activeMinutes || null,
        sessions: []
      };
    }
  }

  async getActiveSessions(minutes: number = 60): Promise<Session[]> {
    const result = await this.getSessions(minutes);
    return result.sessions;
  }
}

export default new SessionsService();
