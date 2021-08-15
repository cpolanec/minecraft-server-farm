import { countResources, expect } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import { mocked } from 'ts-jest/utils';
import AppParameters from '../lib/app-parameters';
import NetworkStack from '../lib/network-stack';
import PaperMCApiClient from '../lib/papermc-api-client';
import ServerFarmStack from '../lib/server-farm-stack';
import StackSpecification from '../lib/stack-specification';

// Prepare a mocked version of 'got' to catch the calls to the PaperMC REST API.
jest.mock('../lib/papermc-api-client');
const mockedPaperMC = mocked(PaperMCApiClient);
mockedPaperMC.gatherLatestBuildNumber = jest.fn().mockResolvedValue(0);
mockedPaperMC.createDownloadUrl = jest.fn().mockResolvedValue('');

let serversStack: ServerFarmStack;

beforeAll(() => {
  process.env.ENVIRONMENT = 'test';
  process.env.SERVER_DEFINITION_SOURCE = 'file://./test/unittestdefs.json';
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

test('validate stack has nested stacks', () => {
  expect(serversStack).to(countResources('Custom::GameBackups', 2));
  expect(serversStack).to(countResources('AWS::CloudFormation::Stack', 3));
});
