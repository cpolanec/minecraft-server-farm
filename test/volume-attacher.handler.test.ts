/* eslint-disable no-console */
import * as lambda from 'aws-lambda';
import { EC2 } from 'aws-sdk';
import * as func from '../lib/volume-attacher.handler';

// Mock the console logger to avoid cluttering the Jest output.
// Comment the line below in order to receive console output for debugging.
console.log = jest.fn();

/*
 * Prepare a mocked version of the 'https' module. CloudFormation Custom
 * Resources return responses to a presigned URL so this mock will need
 * to capture the response written to the http endpoint.
 */
let response: string;
beforeEach(() => {
  response = '{}';
});
jest.mock('https', () => ({
  request: jest.fn().mockImplementation((
    _options: never,
    callback: ((httpResponse: unknown) => void),
  ) => {
    callback({ statusCode: 0, statusMessage: 'OK' });
    return {
      on: jest.fn(),
      write: jest.fn((value: string) => { response = value; }),
      end: jest.fn(),
    };
  }),
}));

/*
 * Prepare a mocked version of the AWS SDK to catch calls to the EC2
 * client calls made within the Lambda function handler. The mocked
 * methods will be used to test the Lambda function side effects.
 */
jest.mock('aws-sdk');
const mockAttachVolume = jest.fn().mockReturnValue({
  promise: jest.fn().mockResolvedValue({}),
});
EC2.prototype.attachVolume = mockAttachVolume;
const mockDetachVolume = jest.fn().mockReturnValue({
  promise: jest.fn().mockResolvedValue({}),
});
EC2.prototype.detachVolume = mockDetachVolume;
const mockWaitFor = jest.fn().mockReturnValue({
  promise: jest.fn(),
});
EC2.prototype.waitFor = mockWaitFor;

/*
 * Prepare prototype objects needed for calling the Lambda function
 * handler. These objects will be reset between test cases.
 */
let cfnEvent: lambda.CloudFormationCustomResourceEvent;
let context: lambda.Context;
beforeEach(() => {
  cfnEvent = {
    RequestType: 'Create',
    LogicalResourceId: '',
    RequestId: '',
    ResourceType: '',
    ResponseURL: '',
    ServiceToken: '',
    StackId: '',
    ResourceProperties: {
      ServiceToken: '',
    },
  };
  context = {
    awsRequestId: '',
    callbackWaitsForEmptyEventLoop: true,
    functionName: 'handler',
    functionVersion: '0',
    invokedFunctionArn: '',
    logGroupName: '',
    logStreamName: '',
    memoryLimitInMB: '',
    getRemainingTimeInMillis: () => 0,
    done: () => { },
    fail: () => { },
    succeed: () => { },
  };
});

test('ResourceProperties input validation', async () => {
  // validate that missing 'OnEvent' input results in failure
  cfnEvent.ResourceProperties = {
    ServiceToken: '',
    InstanceId: 'i-0123456789',
  };
  await func.handler(cfnEvent, context);
  expect(JSON.parse(response)).toMatchObject({
    Status: 'FAILED',
  });

  // validate that missing 'VpcId' input results in failure
  cfnEvent.ResourceProperties = {
    ServiceToken: '',
    VolumeId: 'v-0123456789',
  };
  await func.handler(cfnEvent, context);
  expect(JSON.parse(response)).toMatchObject({
    Status: 'FAILED',
  });
});

test('validate \'Create\' event use case', async () => {
  cfnEvent.RequestType = 'Create';
  cfnEvent.ResourceProperties = {
    ServiceToken: '',
    InstanceId: 'i-0123456789',
    VolumeId: 'v-0123456789',
  };
  await func.handler(cfnEvent, context);
  expect(JSON.parse(response)).toMatchObject({
    Status: 'SUCCESS',
  });
  expect(mockAttachVolume).toBeCalled();
});

test('validate \'Delete\' event use case', async () => {
  cfnEvent.RequestType = 'Delete';
  cfnEvent.ResourceProperties = {
    ServiceToken: '',
    InstanceId: 'i-0123456789',
    VolumeId: 'v-0123456789',
  };
  await func.handler(cfnEvent, context);
  expect(JSON.parse(response)).toMatchObject({
    Status: 'SUCCESS',
  });
  expect(mockDetachVolume).toBeCalled();
});

test('validate \'Update\' event use case', async () => {
  cfnEvent.RequestType = 'Update';
  cfnEvent.ResourceProperties = {
    ServiceToken: '',
    InstanceId: 'i-0123456789',
    VolumeId: 'v-0123456789',
  };
  await func.handler(cfnEvent, context);
  expect(JSON.parse(response)).toMatchObject({
    Status: 'SUCCESS',
  });
  expect(mockDetachVolume).toBeCalled();
  expect(mockWaitFor).toBeCalled();
  expect(mockAttachVolume).toBeCalled();
});
