import {context, getOctokit} from '@actions/github';

export interface WorkflowUrl {
  repo: string;
  action: string;
  event?: string;
}

export interface CommitContext {
  message: string;
  url: string;
  author?: {
    name: string;
    url: string;
  };
}

export async function getCommit(token: string): Promise<CommitContext> {
  const {owner, repo} = context.repo;
  const ref: string = process.env.GITHUB_HEAD_REF
    ? process.env.GITHUB_HEAD_REF.replace(/refs\/heads\//, '')
    : context.sha;
  const client = getOctokit(token);
  const {data: commit} = await client.repos.getCommit({
    owner,
    repo,
    ref
  });

  const result: CommitContext = {
    message: commit.commit.message,
    url: commit.html_url
  };

  if (commit.author) {
    result.author = {
      name: commit.author.login,
      url: commit.author.html_url
    };
  }

  return result;
}

function isPullRequest(): boolean {
  return context.eventName === 'pull_request';
}

export function getWorkflowUrls(): WorkflowUrl {
  const {owner, repo} = context.repo;
  const repoUrl: string = `https://github.com/${owner}/${repo}`;
  const result: WorkflowUrl = {
    repo: repoUrl,
    action: repoUrl
  };

  if (isPullRequest()) {
    const number = context.issue.number;
    result.event = `${repoUrl}/pull/${number}`;
    result.action = `${result.event}/checks`;
  } else {
    result.action = `${repoUrl}/commit/${context.sha}/checks`;
  }

  return result;
}
