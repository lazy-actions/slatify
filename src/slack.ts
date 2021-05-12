import {context} from '@actions/github';
import {MrkdwnElement} from '@slack/types';
import {
  IncomingWebhook,
  IncomingWebhookSendArguments,
  IncomingWebhookDefaultArguments
} from '@slack/webhook';
import * as github from './github';

export class Block {
  static readonly status = {
    success: {
      color: '#2cbe4e',
      result: 'Succeeded'
    },
    failure: {
      color: '#cb2431',
      result: 'Failed'
    },
    cancelled: {
      color: '#ffc107',
      result: 'Cancelled'
    }
  };

  public static getBaseField(): MrkdwnElement[] {
    const {owner, repo} = context.repo;
    const url = github.getWorkflowUrls();
    const eventText = url.event
      ? `<${url.event}|${context.eventName}>`
      : context.eventName;
    return [
      {
        type: 'mrkdwn',
        text: `*repository*\n<${url.repo}|${owner}/${repo}>`
      },
      {
        type: 'mrkdwn',
        text: `*ref*\n${context.ref}`
      },
      {
        type: 'mrkdwn',
        text: `*event name*\n${eventText}`
      },
      {
        type: 'mrkdwn',
        text: `*workflow*\n<${url.action}|${context.workflow}>`
      }
    ];
  }

  public static getCommitField(commit: github.CommitContext): MrkdwnElement[] {
    const commitMsg = commit.message.split('\n')[0];
    const commitUrl = commit.url;
    const field: MrkdwnElement[] = [
      {
        type: 'mrkdwn',
        text: `*commit*\n<${commitUrl}|${commitMsg}>`
      }
    ];

    const author = commit.author;
    if (author) {
      field.push({
        type: 'mrkdwn',
        text: `*author*\n<${author.url}|${author.name}>`
      });
    }

    return field;
  }
}

export class Slack {
  public static isMention(condition: string, status: string): boolean {
    return condition === 'always' || condition === status;
  }

  public static generatePayload(
    jobName: string,
    status: string,
    mention: string,
    mentionCondition: string,
    commit?: github.CommitContext
  ): IncomingWebhookSendArguments {
    const blockStatus = Block.status[status];
    const tmpText = `${jobName} ${blockStatus.result}`;
    const text =
      mention && Slack.isMention(mentionCondition, status)
        ? `<!${mention}> ${tmpText}`
        : tmpText;
    const baseBlock = {
      type: 'section',
      fields: Block.getBaseField()
    };

    if (commit) {
      const commitField = Block.getCommitField(commit);
      Array.prototype.push.apply(baseBlock.fields, commitField);
    }

    return {
      text,
      attachments: [
        {
          color: blockStatus.color,
          blocks: [baseBlock]
        }
      ],
      unfurl_links: true
    };
  }

  public static async notify(
    url: string,
    options: IncomingWebhookDefaultArguments,
    payload: IncomingWebhookSendArguments
  ): Promise<void> {
    const client = new IncomingWebhook(url, options);
    const res = await client.send(payload);
    if (res.text !== 'ok') {
      throw new Error(`Failed to send notification to Slack
        Response: ${JSON.stringify(res.text)}
        `);
    }
  }
}
