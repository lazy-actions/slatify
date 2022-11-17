# Slatify

Forked from https://github.com/lazy-actions/slatify which appears to be abandoned

![Build](https://img.shields.io/github/workflow/status/lazy-actions/slatify/Build?label=build)
![Test](https://img.shields.io/github/workflow/status/lazy-actions/slatify/Tests?label=test)
![GitHub release (latest by date)](https://img.shields.io/github/v/release/lazy-actions/slatify?color=brightgreen)
![GitHub](https://img.shields.io/github/license/lazy-actions/slatify?color=brightgreen)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

This is Slack Notification Action.

# Announcement

:rotating_light: Transferred repository from homoluctus :rotating_light:

We don't need to rename from homoluctus/slatify to lazy-actions/slatify in .github/workflow/*.yml.
You can use as it is, but we recommend renaming it to lazy-actions/slatify.

# ToC

<!-- TOC depthFrom:2 -->

- [Feature](#feature)
- [Inputs](#inputs)
- [Examples](#examples)
  - [Basic usage](#basic-usage)
  - [Includes the latest commit information](#includes-the-latest-commit-information)
- [Slack UI](#slack-ui)
- [LICENSE](#license)

<!-- /TOC -->

## Feature

- Notify the result of GitHub Actions
- Support three job status (reference: [job-context](https://help.github.com/en/articles/contexts-and-expression-syntax-for-github-actions#job-context))
  - success
  - failure
  - cancelled
- Mention
  - Notify message to channel members efficiently
  - You can specify the condition to mention

## Inputs

First of all, you need to set GitHub secrets for SLACK_WEBHOOK that is Incoming Webhook URL.<br>
You can customize the following parameters:

|with parameter|required/optional|default|description|
|:--:|:--:|:--|:--|
|type|required|N/A|The result of GitHub Actions job<br>This parameter value must contain the following word:<br>- `success`<br>- `failure`<br>- `cancelled`<br>We recommend using ${{ job.status }}|
|job_name|required|N/A|Means slack notification title|
|url|required|N/A|Slack Incoming Webhooks URL<br>Please specify this key or SLACK_WEBHOOK environment variable<br>※SLACK_WEBHOOK will be deprecated|
|mention|optional|N/A|Slack message mention|
|mention_if|optional|N/A|The condition to mention<br>This parameter can contain the following word:<br>- `success`<br>- `failure`<br>- `cancelled`<br>- `always`|
|icon_emoji|optional|Use Slack Incoming Webhook configuration|Slack icon|
|username|optional|Use Slack Incoming Webhook configuration|Slack username|
|channel|optional|Use Slack Incoming Webhook configuration|Slack channel name|
|commit|optional|false|If true, slack notification includes the latest commit message and author.|
|token|case by case|N/A|This token is used to get commit data.<br>If commit parameter is true, this parameter is required.<br>${{ secrets.GITHUB_TOKEN }} is recommended.|

Please refer to [action.yml](./action.yml) for more details.

## Examples

### Basic usage

```..github/workflows/example1.yml
- name: Slack Notification
  uses: lazy-actions/slatify@master
  if: always()
  with:
    type: ${{ job.status }}
    job_name: '*Test*'
    channel: '#random'
    url: ${{ secrets.SLACK_WEBHOOK }}
```

### Includes the latest commit information

```..github/workflows/example2.yml
- name: Slack Notification
  uses: lazy-actions/slatify@master
  if: always()
  with:
    type: ${{ job.status }}
    job_name: '*Lint Check*'
    mention: 'here'
    mention_if: 'failure'
    channel: '#random'
    url: ${{ secrets.SLACK_WEBHOOK }}
    commit: true
    token: ${{ secrets.GITHUB_TOKEN }}
```

## Slack UI

<img src="./images/slack2.png" alt="Notification Preview" width="90%">

---

<img src="./images/slack.png" alt="Notification Preview" width="90%">

## LICENSE

[The MIT License (MIT)](https://github.com/lazy-actions/slatify/blob/master/LICENSE)
