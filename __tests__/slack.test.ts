import * as github from '@actions/github';
import {Block, Slack} from '../src/slack';
import {commonContext, repoUrl} from './github.test';

describe('Base Field Tests', () => {
  function generateExpectedBaseField(
    actionUrl: string,
    eventBlockText: string
  ): object[] {
    return [
      {
        type: 'mrkdwn',
        text: `*repository*\n<${repoUrl}|${commonContext.owner}/${commonContext.repo}>`
      },
      {
        type: 'mrkdwn',
        text: `*ref*\n${commonContext.ref}`
      },
      {
        type: 'mrkdwn',
        text: `*event name*\n${eventBlockText}`
      },
      {
        type: 'mrkdwn',
        text: `*workflow*\n<${actionUrl}|${commonContext.workflow}>`
      }
    ];
  }

  test('With event link', () => {
    github.context.eventName = 'pull_request';
    const eventUrl = `${repoUrl}/pull/${commonContext.number}`;
    const actionUrl = `${eventUrl}/checks`;
    const expectedBaseField = generateExpectedBaseField(
      actionUrl,
      `<${eventUrl}|${github.context.eventName}>`
    );
    expect(Block.getBaseField()).toEqual(expectedBaseField);
  });

  test('Without event link', () => {
    github.context.eventName = 'push';
    const actionUrl = `${repoUrl}/commit/${commonContext.sha}/checks`;
    const expectedBaseField = generateExpectedBaseField(
      actionUrl,
      github.context.eventName
    );
    expect(Block.getBaseField()).toEqual(expectedBaseField);
  });
});

describe('Commit Field Tests', () => {
  test('Commit field with author', () => {
    const context = {
      url: 'https://this.is.test',
      message: 'this is test',
      author: {
        url: 'https://lazy-actions',
        name: 'lazy-actions'
      }
    };
    const expectedCommitField = [
      {
        type: 'mrkdwn',
        text: `*commit*\n<${context.url}|${context.message}>`
      },
      {
        type: 'mrkdwn',
        text: `*author*\n<${context.author.url}|${context.author.name}>`
      }
    ];

    expect(Block.getCommitField(context)).toEqual(expectedCommitField);
  });

  test('Commit field without author', () => {
    const context = {
      url: 'https://this.is.test',
      message: 'this is test'
    };
    const expectedCommitField = [
      {
        type: 'mrkdwn',
        text: `*commit*\n<${context.url}|${context.message}>`
      }
    ];
    expect(Block.getCommitField(context)).toEqual(expectedCommitField);
  });
});

describe('Slack Tests', () => {
  const context = {
    jobName: 'test',
    status: 'success',
    mention: 'bot',
    mentionCondition: 'always',
    commit: {
      message: 'Hello World\nYEAH!!!!!',
      url: 'https://this.is.test',
      author: {
        name: 'lazy-actions',
        url: 'https://lazy-actions'
      }
    }
  };

  test('Mention needs always', () => {
    expect(Slack.isMention('always', 'test')).toBe(true);
  });

  test('Mention needs when failed', () => {
    expect(Slack.isMention('failure', 'failure')).toBe(true);
  });

  test('No mention because condition and actual status are different', () => {
    expect(Slack.isMention('success', 'failure')).toBe(false);
  });

  test('Generate slack payload', () => {
    github.context.eventName = 'pull_request';
    const eventUrl = `${repoUrl}/pull/${commonContext.number}`;

    const expectedPayload = {
      text: `<!${context.mention}> ${context.jobName} ${
        Block.status[context.status]['result']
      }`,
      attachments: [
        {
          color: Block.status[context.status]['color'],
          blocks: [
            {
              type: 'section',
              fields: [
                {
                  type: 'mrkdwn',
                  text: `*repository*\n<${repoUrl}|${commonContext.owner}/${commonContext.repo}>`
                },
                {
                  type: 'mrkdwn',
                  text: `*ref*\n${commonContext.ref}`
                },
                {
                  type: 'mrkdwn',
                  text: `*event name*\n<${eventUrl}|${github.context.eventName}>`
                },
                {
                  type: 'mrkdwn',
                  text: `*workflow*\n<${eventUrl}/checks|${commonContext.workflow}>`
                },
                {
                  type: 'mrkdwn',
                  text: `*commit*\n<${context.commit.url}|${
                    context.commit.message.split('\n')[0]
                  }>`
                },
                {
                  type: 'mrkdwn',
                  text: `*author*\n<${context.commit.author.url}|${context.commit.author.name}>`
                }
              ]
            }
          ]
        }
      ],
      unfurl_links: true
    };

    expect(
      Slack.generatePayload(
        context.jobName,
        context.status,
        context.mention,
        context.mentionCondition,
        context.commit
      )
    ).toEqual(expectedPayload);
  });
});
