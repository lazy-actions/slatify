import * as core from '@actions/core';
import {IncomingWebhookDefaultArguments} from '@slack/webhook';

import {isValidCondition, validateStatus} from './utils';
import {Slack, SlackBotOptions} from './slack';

async function run() {
  try {
    const status: string = validateStatus(
      core.getInput('type', {required: true}).toLowerCase()
    );
    const jobName: string = core.getInput('job_name', {required: true});
    let mention: string = core.getInput('mention');
    let mentionCondition: string = core.getInput('mention_if').toLowerCase();
    const url: string = process.env.SLACK_WEBHOOK || core.getInput('url');
    const webhookOptions: IncomingWebhookDefaultArguments = {
      username: core.getInput('username'),
      channel: core.getInput('channel'),
      icon_emoji: core.getInput('icon_emoji')
    };
    const slackBotOptions: SlackBotOptions = {
      token: process.env.SLACK_TOKEN || core.getInput('slack_token'),
      channel: process.env.SLACK_CHANNEL || core.getInput('channel'),
      username: core.getInput('username'),
      icon_emoji: core.getInput('icon_emoji')
    };
    const commitFlag: boolean = core.getInput('commit') === 'true';
    const gitHubToken: string = core.getInput('token');

    if (mention && !isValidCondition(mentionCondition)) {
      mention = '';
      mentionCondition = '';
      console.warn(`
      Ignore slack message mention:
      mention_if: ${mentionCondition} is invalid
      `);
    }

    if (url === '') {
      if (slackBotOptions.token === '' && slackBotOptions.channel === '') {
        throw new Error(`[Error] Missing Slack Incoming Webhooks URL.
      Please configure "SLACK_WEBHOOK" as environment variable or
      specify the key called "url" in "with" section.
      `);
      }
    }

    const slack = new Slack();
    const payload = await slack.generatePayload(
      jobName,
      status,
      mention,
      mentionCondition,
      commitFlag,
      gitHubToken
    );
    console.info(`Generated payload for slack: ${JSON.stringify(payload)}`);

    if (url !== '') {
      await slack.notifyWebhook(url, webhookOptions, payload);
    } else {
      await slack.notifyChat(
        slackBotOptions.token,
        slackBotOptions.channel,
        payload
      );
    }
    console.info('Sent message to Slack');
  } catch (err) {
    core.setFailed(err.message);
  }
}

run();
