import * as github from '@actions/github';
import {getWorkflowUrls} from '../src/github';

export const commonContext = {
  workflow: 'test',
  ref: '1',
  sha: '2',
  owner: 'onvista-media',
  repo: 'slatify',
  number: 3
};
export const repoUrl = `https://github.com/${commonContext.owner}/${commonContext.repo}`;

github.context.workflow = commonContext.workflow;
github.context.ref = commonContext.ref;
github.context.sha = commonContext.sha;
github.context.payload = {
  issue: {
    number: commonContext.number
  },
  repository: {
    owner: {
      login: commonContext.owner
    },
    name: commonContext.repo
  }
};

describe('Workflow URL Tests', () => {
  test('Pull Request event', () => {
    github.context.eventName = 'pull_request';
    const expectedEventUrl = `${repoUrl}/pull/${commonContext.number}`;
    const expectedUrls = {
      repo: repoUrl,
      event: expectedEventUrl,
      action: `${expectedEventUrl}/checks`
    };
    expect(getWorkflowUrls()).toEqual(expectedUrls);
  });

  test('Push event', () => {
    github.context.eventName = 'commit';
    const expectedUrls = {
      repo: repoUrl,
      action: `${repoUrl}/commit/${commonContext.sha}/checks`
    };
    expect(getWorkflowUrls()).toEqual(expectedUrls);
  });
});
