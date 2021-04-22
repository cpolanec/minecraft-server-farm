import { countResources, expect } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import AppParameters from '../lib/app-parameters';
import NetworkStack from '../lib/network-stack';
import ServerFarmStack from '../lib/server-farm-stack';
import StackSpecification from '../lib/stack-specification';

let serversStack: ServerFarmStack;

beforeAll(() => {
  AppParameters.init('test/.env.testing');
  const app = new cdk.App();

  const networkSpec = new StackSpecification('network');
  const networkStack = new NetworkStack(app, networkSpec);

  const serversSpec = new StackSpecification('servers');
  serversStack = new ServerFarmStack(app, serversSpec, networkStack);
});

test('validate stack has nested stacks', () => {
  expect(serversStack).to(countResources('AWS::CloudFormation::Stack', 3));
});
