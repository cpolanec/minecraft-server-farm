/* eslint-disable import/prefer-default-export */
/* eslint-disable no-console */
import * as aws from 'aws-sdk';
import { EC2 } from 'aws-sdk';
import * as lambda from 'aws-lambda';
import * as https from 'https';
import * as url from 'url';

/**
 * Class that encapsulates all the Minecraft game backup functionality as a
 * Lambda-backed CloudFormation Custom Resource.
 */
class GameVolumeFunction {
  //---------------------------------------------------------------------------
  // LAMBDA FUNCTION HANDLERS
  //---------------------------------------------------------------------------

  /**
   * Main handler for this AWS Lambda Function.
   *
   * @param event CloudFormation Custom Resource request event
   * @param context Information about the execution environment
   */
  public handler = async (
    event: lambda.CloudFormationCustomResourceEvent,
    context: lambda.Context,
  ): Promise<void> => {
    try {
      console.log(`event:\n${JSON.stringify(event)}`);

      // validate the supplied ResourceProperties
      if (!event.ResourceProperties.InstanceId) {
        throw new Error('required resource property not defined: InstanceId');
      }
      if (!event.ResourceProperties.VolumeId) {
        throw new Error('required resource property not defined: VolumeId');
      }

      const instanceId = event.ResourceProperties.InstanceId as string;
      const volumeId = event.ResourceProperties.VolumeId as string;

      if (event.RequestType === 'Create') {
        console.log(`attach volume ${volumeId} to instance ${instanceId}`);
        await this.ec2Client.attachVolume({
          InstanceId: instanceId,
          VolumeId: volumeId,
          Device: '/dev/sdm',
        } as aws.EC2.AttachVolumeRequest).promise();
      } else if (event.RequestType === 'Delete') {
        console.log(`detach volume ${volumeId}`);
        await this.ec2Client.detachVolume({
          VolumeId: volumeId,
        } as aws.EC2.DetachVolumeRequest).promise();
      } else if (event.RequestType === 'Update') {
        console.log(`detach volume ${volumeId}`);
        await this.ec2Client.detachVolume({
          VolumeId: volumeId,
        } as aws.EC2.DetachVolumeRequest).promise();
        console.log(`wait for volume ${volumeId} to be available`);
        await this.ec2Client.waitFor('volumeAvailable', {
          VolumeIds: [volumeId],
        } as aws.EC2.DescribeVolumesRequest).promise();
        console.log(`attach volume ${volumeId} to instance ${instanceId}`);
        await this.ec2Client.attachVolume({
          InstanceId: instanceId,
          VolumeId: volumeId,
          Device: '/dev/sdm',
        } as aws.EC2.AttachVolumeRequest).promise();
      }

      await GameVolumeFunction.sendResponse(event, context);
    } catch (e) {
      const error = (e as Error);
      console.log(`handler(..) failed: ${error.message}`);
      console.log(`stack trace: ${error.stack ?? 'none'}`);
      await GameVolumeFunction.sendResponse(event, context, error.message);
    }
  };

  //---------------------------------------------------------------------------
  // OBJECT ATTRIBUTES
  //---------------------------------------------------------------------------

  /**
   * AWS SDK EC2 client to use across the Lambda function
   */
  private ec2Client = new EC2();

  //---------------------------------------------------------------------------
  // OBJECT FUNCTIONALITY
  //---------------------------------------------------------------------------

  //---------------------------------------------------------------------------
  // CLASS FUNCTIONALITY (HELPER FUNCTIONS)
  //---------------------------------------------------------------------------

  /**
   * Send a CloudFormation response to the URL provided in the CloudFormation
   * Custom Resource request event.
   *
   * @param event CloudFormation Custom Resource request event
   * @param context Information about the execution environment
   * @param errorMessage If a failure occurred, provide the error message (otherwise
   *   a status of 'SUCCESS' will be assumed).
   */
  static sendResponse(
    event: lambda.CloudFormationCustomResourceEvent,
    context: lambda.Context,
    errorMessage?: string,
  ): Promise<void> {
    const action = event.ResourceProperties.OnEvent as string;
    const vpcId = event.ResourceProperties.VpcId as string;
    const physicalResourceId = (
      event.RequestType === 'Create'
        ? `backups-on${action}-${vpcId}`
        : (event.PhysicalResourceId ?? context.logStreamName)
    );
    const responseBody = JSON.stringify({
      Status: !errorMessage ? 'SUCCESS' : 'FAILED',
      Reason: errorMessage,
      RequestId: event.RequestId,
      StackId: event.StackId,
      LogicalResourceId: event.LogicalResourceId,
      PhysicalResourceId: physicalResourceId,
    });
    console.log(`response.body: ${responseBody}`);

    const parsedUrl = url.parse(event.ResponseURL);
    const requestOptions: https.RequestOptions = {
      method: 'PUT',
      hostname: parsedUrl.hostname,
      path: parsedUrl.path,
      headers: {
        'content-type': '',
        'content-length': responseBody.length,
      },
    };
    return new Promise<void>((resolve, reject) => {
      const request = https.request(requestOptions, (response) => {
        console.log(`response.statusCode: ${response.statusCode ?? 'undefined'}`);
        console.log(`response.statusMessage: ${response.statusMessage ?? 'undefined'}`);
        resolve();
      });
      request.on('error', reject);
      request.write(responseBody);
      request.end();
    });
  }
}
export const { handler } = new GameVolumeFunction();
