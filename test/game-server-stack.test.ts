import {
  countResources, expect, haveResource,
} from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import AppParameters from '../lib/app-parameters';
import NetworkStack from '../lib/network-stack';
import ServerFarmStack from '../lib/server-farm-stack';
import StackSpecification from '../lib/stack-specification';

let serversStack: ServerFarmStack;

beforeAll(() => {
  process.env.ENVIRONMENT = 'test';
  process.env.SERVER_DEFINITION_SOURCE = 'file://./test/definitions';
  process.env.S3_BUCKET_NAME = 'my-bucket-name';
  process.env.SSH_KEY_NAME = 'some_ec2_ssh_key_name';
  process.env.DEPLOY_ROLE_ARN = 'arn:aws:iam::XXXXXXXXXXXX:role/my-deploy-role';
  process.env.PUBLISH_ROLE_ARN = 'arn:aws:iam::XXXXXXXXXXXX:role/my-publish-role';
  process.env.CLOUDFORMATION_ROLE_ARN = 'arn:aws:iam::XXXXXXXXXXXX:role/my-cloudformation-role';
  process.env.LAMBDA_ROLE_ARN = 'arn:aws:iam::XXXXXXXXXXXX:role/my-lambda-role';
  process.env.EC2_ROLE_ARN = 'arn:aws:iam::XXXXXXXXXXXX:role/my-ec2-role';

  AppParameters.init();
  const app = new cdk.App();

  const networkSpec = new StackSpecification('network');
  const networkStack = new NetworkStack(app, networkSpec);

  const serversSpec = new StackSpecification('servers');
  serversStack = new ServerFarmStack(app, serversSpec, networkStack);
});

test('validate that stack has nested stack', () => {
  expect(serversStack).to(countResources('AWS::CloudFormation::Stack', 1));
});

test('validate nested stack has correct resources', () => {
  expect(serversStack.gameServerStacks[0]).to(haveResource('AWS::EC2::Instance'));
  expect(serversStack.gameServerStacks[0]).to(haveResource('AWS::EC2::EIP'));
  expect(serversStack.gameServerStacks[0]).to(haveResource('AWS::EC2::Volume'));
  expect(serversStack.gameServerStacks[0]).to(haveResource('AWS::EC2::VolumeAttachment'));
});
