import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface GitHubPR {
  number: number;
  title: string;
  state: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  url: string;
}

export interface GitHubCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

export interface GitHubDeployment {
  id: number;
  environment: string;
  state: string;
  description: string;
  creator: string;
  createdAt: string;
  updatedAt: string;
}

export interface GitHubRepoInfo {
  name: string;
  fullName: string;
  description: string;
  private: boolean;
  defaultBranch: string;
  url: string;
  forks: number;
  stars: number;
  openIssues: number;
  language: string;
}

class GitHubService {
  private repo: string = 'salmaanakhtar/controlplane-project-manager';

  async getRecentPRs(limit: number = 10): Promise<GitHubPR[]> {
    try {
      const { stdout } = await execAsync(
        `gh pr list --repo ${this.repo} --limit ${limit} --json number,title,state,author,createdAt,updatedAt,url`,
        { timeout: 10000 }
      );
      return JSON.parse(stdout);
    } catch (error) {
      console.error('Error fetching PRs:', error);
      return [];
    }
  }

  async getRecentCommits(limit: number = 10): Promise<GitHubCommit[]> {
    try {
      const { stdout } = await execAsync(
        `gh api repos/${this.repo}/commits --paginate -F per_page=${limit} --jq '.[] | {sha: .sha, message: .commit.message, author: .commit.author.name, date: .commit.author.date, url: .html_url }'`,
        { timeout: 10000 }
      );
      const commits = stdout.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
      return commits;
    } catch (error) {
      console.error('Error fetching commits:', error);
      return [];
    }
  }

  async getDeployments(): Promise<GitHubDeployment[]> {
    try {
      const { stdout } = await execAsync(
        `gh api repos/${this.repo}/deployments --paginate --jq '.[] | {id: .id, environment: .environment, state: .state, description: .description, creator: .creator.login, createdAt: .created_at, updatedAt: .updated_at }'`,
        { timeout: 10000 }
      );
      if (!stdout.trim()) return [];
      const deployments = stdout.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
      return deployments;
    } catch (error) {
      console.error('Error fetching deployments:', error);
      return [];
    }
  }

  async getRepoInfo(): Promise<GitHubRepoInfo | null> {
    try {
      const { stdout } = await execAsync(
        `gh repo view ${this.repo} --json name,fullName,description,isPrivate,defaultBranch,url,forks,stargazerCount,openIssuesCount,primaryLanguage`,
        { timeout: 10000 }
      );
      const data = JSON.parse(stdout);
      return {
        name: data.name,
        fullName: data.fullName,
        description: data.description || '',
        private: data.isPrivate,
        defaultBranch: data.defaultBranch,
        url: data.url,
        forks: data.forks.totalCount || data.forks,
        stars: data.stargazerCount,
        openIssues: data.openIssuesCount,
        language: data.primaryLanguage?.name || 'Unknown'
      };
    } catch (error) {
      console.error('Error fetching repo info:', error);
      return null;
    }
  }
}

export default new GitHubService();
