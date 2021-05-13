/* eslint-disable no-console */
import * as lambda from 'aws-lambda';
import * as aws from 'aws-sdk';
import * as func from '../lib/game-backups.handler';

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
const mockDescribeInstances = jest.fn().mockReturnValue({
  promise: jest.fn().mockResolvedValue({}),
});
aws.EC2.prototype.describeInstances = mockDescribeInstances;
const mockStopInstances = jest.fn().mockReturnValue({
  promise: jest.fn(),
});
aws.EC2.prototype.stopInstances = mockStopInstances;
const mockWaitFor = jest.fn().mockReturnValue({
  promise: jest.fn(),
});
aws.EC2.prototype.waitFor = mockWaitFor;
const mockCreateSnapshot = jest.fn().mockReturnValue({
  promise: jest.fn().mockResolvedValue({ SnapshotId: 'snap-0123456789' }),
});
aws.EC2.prototype.createSnapshot = mockCreateSnapshot;
beforeEach(() => {
  mockDescribeInstances.mockClear();
  mockStopInstances.mockClear();
  mockWaitFor.mockClear();
  mockCreateSnapshot.mockClear();
});

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
    VpcId: 'i-0123456789',
  };
  await func.handler(cfnEvent, context);
  expect(JSON.parse(response)).toMatchObject({
    Status: 'FAILED',
  });

  // validate that missing 'VpcId' input results in failure
  cfnEvent.ResourceProperties = {
    ServiceToken: '',
    OnEvent: 'Create',
  };
  await func.handler(cfnEvent, context);
  expect(JSON.parse(response)).toMatchObject({
    Status: 'FAILED',
  });
});

test('mismatched RequestType and OnEvent', async () => {
  // validate that no action is taken when RequestType and OnEvent function
  // input values do not match (response should still be successful)
  cfnEvent.RequestType = 'Create';
  cfnEvent.ResourceProperties = {
    ServiceToken: '',
    OnEvent: 'Update',
    VpcId: 'vpc-0123456789',
  };
  await func.handler(cfnEvent, context);
  expect(JSON.parse(response)).toMatchObject({
    Status: 'SUCCESS',
  });
  expect(mockStopInstances).not.toBeCalled();
  expect(mockCreateSnapshot).not.toBeCalled();
});

test('empty \'Reservations\' list cases', async () => {
  // validate response from ec2.describeInstances(..) with missing
  // 'Reservations' data can be handled successfully
  aws.EC2.prototype.describeInstances = jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({}),
  });
  cfnEvent.RequestType = 'Update';
  cfnEvent.ResourceProperties.OnEvent = 'Update';
  cfnEvent.ResourceProperties.VpcId = 'vpc-0123456789';
  await func.handler(cfnEvent, context);
  expect(JSON.parse(response)).toMatchObject({
    Status: 'SUCCESS',
  });
  expect(mockStopInstances).toBeCalled();
  expect(mockStopInstances).toBeCalledWith({
    Force: true,
    InstanceIds: [],
  });
  expect(mockCreateSnapshot).not.toBeCalled();

  aws.EC2.prototype.describeInstances = jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({
      Reservations: [],
    }),
  });
  cfnEvent.RequestType = 'Update';
  cfnEvent.ResourceProperties.OnEvent = 'Update';
  cfnEvent.ResourceProperties.VpcId = 'vpc-0123456789';
  await func.handler(cfnEvent, context);
  expect(JSON.parse(response)).toMatchObject({
    Status: 'SUCCESS',
  });
  expect(mockStopInstances).toBeCalled();
  expect(mockStopInstances).toBeCalledWith({
    Force: true,
    InstanceIds: [],
  });
  expect(mockCreateSnapshot).not.toBeCalled();
});

test('empty \'Instances\' cases', async () => {
  // validate response from ec2.describeInstances(..) with missing
  // 'Instances' data can be handled successfully
  aws.EC2.prototype.describeInstances = jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({
      Reservations: [{}],
    }),
  });
  cfnEvent.RequestType = 'Update';
  cfnEvent.ResourceProperties.OnEvent = 'Update';
  cfnEvent.ResourceProperties.VpcId = 'vpc-0123456789';
  await func.handler(cfnEvent, context);
  expect(JSON.parse(response)).toMatchObject({
    Status: 'SUCCESS',
  });
  expect(mockStopInstances).toBeCalled();
  expect(mockStopInstances).toBeCalledWith({
    Force: true,
    InstanceIds: [],
  });
  expect(mockCreateSnapshot).not.toBeCalled();

  aws.EC2.prototype.describeInstances = jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({
      Reservations: [{
        Instances: [],
      }],
    }),
  });
  cfnEvent.RequestType = 'Update';
  cfnEvent.ResourceProperties.OnEvent = 'Update';
  cfnEvent.ResourceProperties.VpcId = 'vpc-0123456789';
  await func.handler(cfnEvent, context);
  expect(JSON.parse(response)).toMatchObject({
    Status: 'SUCCESS',
  });
  expect(mockStopInstances).toBeCalled();
  expect(mockStopInstances).toBeCalledWith({
    Force: true,
    InstanceIds: [],
  });
  expect(mockCreateSnapshot).not.toBeCalled();
});

test('validate single instances case', async () => {
  aws.EC2.prototype.describeInstances = jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({
      Reservations: [{
        Instances: [{
          InstanceId: 'i-0123456789',
          BlockDeviceMappings: [
            { DeviceName: '/dev/sda' },
            {
              DeviceName: '/dev/sdm',
              Ebs: { VolumeId: 'vol-0123456789' },
            },
          ],
        }],
      }],
    }),
  });
  cfnEvent.RequestType = 'Update';
  cfnEvent.ResourceProperties.OnEvent = 'Update';
  cfnEvent.ResourceProperties.VpcId = 'vpc-0123456789';
  await func.handler(cfnEvent, context);
  expect(JSON.parse(response)).toMatchObject({
    Status: 'SUCCESS',
  });
  expect(mockStopInstances).toBeCalled();
  expect(mockStopInstances).toBeCalledWith({
    Force: true,
    InstanceIds: ['i-0123456789'],
  });
  expect(mockCreateSnapshot).toBeCalled();
});
