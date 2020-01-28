import * as github from '@actions/github';
import {MessageAttachment, MrkdwnElement} from '@slack/types';
import {
  IncomingWebhook,
  IncomingWebhookDefaultArguments,
  IncomingWebhookResult,
  IncomingWebhookSendArguments
} from '@slack/webhook';
import {Context} from '@actions/github/lib/context';
import {
  ChatPostMessageArguments,
  ErrorCode,
  WebClient
} from '@slack/web-api';

interface Accessory {
  color: string;
  result: string;
}

export interface SlackBotOptions {
  token: string;
  channel: string;
  username: string;
  icon_emoji: string;
}

export interface SlackPayload {
  text: string;
  attachments: MessageAttachment[];
  unfurl_links: boolean;
}

class Block {
  readonly context: Context = github.context;

  public get success(): Accessory {
    return {
      color: '#2cbe4e',
      result: 'Succeeded'
    };
  }

  public get failure(): Accessory {
    return {
      color: '#cb2431',
      result: 'Failed'
    };
  }

  public get cancelled(): Accessory {
    return {
      color: '#ffc107',
      result: 'Cancelled'
    };
  }

  public get isPullRequest(): boolean {
    const {eventName} = this.context;
    return eventName === 'pull_request';
  }

  /**
   * Get slack blocks UI
   * @returns {MrkdwnElement[]} blocks
   */
  public get baseFields(): MrkdwnElement[] {
    const {sha, eventName, workflow, ref} = this.context;
    const {owner, repo} = this.context.repo;
    const {number} = this.context.issue;
    const repoUrl: string = `https://github.com/${owner}/${repo}`;
    let actionUrl: string = repoUrl;
    let eventUrl: string = eventName;

    if (this.isPullRequest) {
      eventUrl = `<${repoUrl}/pull/${number}|${eventName}>`;
      actionUrl += `/pull/${number}/checks`;
    } else {
      actionUrl += `/commit/${sha}/checks`;
    }

    const fields: MrkdwnElement[] = [
      {
        type: 'mrkdwn',
        text: `*repository*\n<${repoUrl}|${owner}/${repo}>`
      },
      {
        type: 'mrkdwn',
        text: `*ref*\n${ref}`
      },
      {
        type: 'mrkdwn',
        text: `*event name*\n${eventUrl}`
      },
      {
        type: 'mrkdwn',
        text: `*workflow*\n<${actionUrl}|${workflow}>`
      }
    ];
    return fields;
  }

  /**
   * Get MrkdwnElement fields including git commit data
   * @param {string} token
   * @returns {Promise<MrkdwnElement[]>}
   */
  public async getCommitFields(token: string): Promise<MrkdwnElement[]> {
    const {owner, repo} = this.context.repo;
    const head_ref: string = process.env.GITHUB_HEAD_REF as string;
    const ref: string = this.isPullRequest
      ? head_ref.replace(/refs\/heads\//, '')
      : this.context.sha;
    const client: github.GitHub = new github.GitHub(token);
    const {data: commit} = await client.repos.getCommit({owner, repo, ref});

    const commitMsg: string = commit.commit.message.split('\n')[0];
    const commitUrl: string = commit.html_url;
    const fields: MrkdwnElement[] = [
      {
        type: 'mrkdwn',
        text: `*commit*\n<${commitUrl}|${commitMsg}>`
      }
    ];

    if (commit.author) {
      const authorName: string = commit.author.login;
      const authorUrl: string = commit.author.html_url;
      fields.push({
        type: 'mrkdwn',
        text: `*author*\n<${authorUrl}|${authorName}>`
      });
    }
    return fields;
  }
}

export class Slack {
  /**
   * Check if message mention is needed
   * @param {string} condition mention condition
   * @param {string} status job status
   * @returns {boolean}
   */
  private isMention(condition: string, status: string): boolean {
    return condition === 'always' || condition === status;
  }

  /**
   * Generate slack payload
   * @param {string} jobName
   * @param {string} status
   * @param {string} mention
   * @param {string} mentionCondition
   * @param {boolean} commitFlag
   * @param {string} gitHubToken
   * @returns {SlackPayload}
   */
  public async generatePayload(
    jobName: string,
    status: string,
    mention: string,
    mentionCondition: string,
    commitFlag: boolean,
    gitHubToken?: string
  ): Promise<SlackPayload> {
    const slackBlockUI = new Block();
    const notificationType: Accessory = slackBlockUI[status];
    const tmpText: string = `${jobName} ${notificationType.result}`;
    const text =
      mention && this.isMention(mentionCondition, status)
        ? `<!${mention}> ${tmpText}`
        : tmpText;
    let baseBlock = {
      type: 'section',
      fields: slackBlockUI.baseFields
    };

    if (commitFlag && gitHubToken) {
      const commitFields: MrkdwnElement[] = await slackBlockUI.getCommitFields(
        gitHubToken
      );
      Array.prototype.push.apply(baseBlock.fields, commitFields);
    }

    const attachments: MessageAttachment = {
      color: notificationType.color,
      blocks: [baseBlock]
    };

    const payload: SlackPayload = {
      text,
      attachments: [attachments],
      unfurl_links: true
    };

    return payload;
  }

  /**
   * Notify information about github actions to Slack
   * @param {string} url
   * @param {IncomingWebhookDefaultArguments} options
   * @param {IncomingWebhookSendArguments} payload
   * @returns {Promise<IncomingWebhookResult>} result
   */
  public async notifyWebhook(
    url: string,
    options: IncomingWebhookDefaultArguments,
    payload: SlackPayload
  ): Promise<void> {
    const client: IncomingWebhook = new IncomingWebhook(url, options);
    const response: IncomingWebhookResult = await client.send({...payload});

    if (response.text !== 'ok') {
      throw new Error(`
      Failed to send notification to Slack
      Response: ${response.text}
      `);
    }
  }

  /**
   * Notify information about github actions to Slack
   * @param {string} token
   * @param {string} channel
   * @param {ChatPostMessageArguments} payload
   * @returns {Promise<void>} result
   */
  public async notifyChat(
    token: string,
    channel: string,
    payload: SlackPayload
  ): Promise<void> {
    const web = new WebClient(token);
    try {
      await web.chat.postMessage({channel: channel, ...payload});
    } catch (error) {
      if (error.code === ErrorCode.PlatformError) {
        console.log(error.data);
      } else {
        console.log('An error occurred', error);
      }
      throw new Error(`
      Failed to send notification to Slack
      Response: ${error.data}
      `);
    }
  }
}
