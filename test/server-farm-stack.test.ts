import { expect, haveResource } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as mockito from 'ts-mockito';
import AppParameters from '../lib/app-parameters';
import NetworkStack from '../lib/network-stack';
import ServerFarmStack from '../lib/server-farm-stack';
import StackSpecification from '../lib/stack-specification';

let serversStack: ServerFarmStack;

beforeAll(() => {
  const app = new cdk.App();

  const mocked: AppParameters = mockito.mock(AppParameters);
  mockito.when(mocked.getQualifier()).thenReturn('mcservers');
  mockito.when(mocked.getEnvironment()).thenReturn('unittest');
  mockito.when(mocked.getSSHKeyName()).thenReturn('vinz-clortho');
  mockito.when(mocked.getMcrconPasswordParameter()).thenReturn('/mcrcon/password');

  const networkSpec = new StackSpecification('network');
  const networkStack = new NetworkStack(app, networkSpec);

  const serversSpec = new StackSpecification('servers');
  serversStack = new ServerFarmStack(app, serversSpec, networkStack);
});

test('validate stack has resources', () => {
  expect(serversStack).to(haveResource('AWS::CloudFormation::Stack'));
});
