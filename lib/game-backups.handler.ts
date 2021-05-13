/* eslint-disable import/prefer-default-export */
/* eslint-disable no-console */
import * as aws from 'aws-sdk';
import * as lambda from 'aws-lambda';
import * as https from 'https';
import * as url from 'url';

/**
 * Class that encapsulates all the Minecraft game backup functionality as a
 * Lambda-backed CloudFormation Custom Resource.
 */
class GameBackupsFunction {
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
      if (!event.ResourceProperties.OnEvent) {
        throw new Error('required resource property not defined: OnEvent');
      }
      if (!event.ResourceProperties.VpcId) {
        throw new Error('required resource property not defined: VpcId');
      }

      const expectedEvent = event.ResourceProperties.OnEvent as string;
      if (event.RequestType === expectedEvent) {
        // backup game servers if the CloudFormation request type (e.g. Create,
        // Update, Delete) matches the expected event
        await this.backupGameServers(event.ResourceProperties.VpcId);
      } else {
        // take no action if the CloudFormation request type does not match
        // the expected event
        console.log('no action taken: '
          + `received '${event.RequestType}' instead of '${expectedEvent}' request type`);
      }

      await GameBackupsFunction.sendResponse(event, context);
    } catch (e) {
      const error = (e as Error);
      console.log(`handler(..) failed: ${error.message}`);
      console.log(`stack trace: ${error.stack ?? 'none'}`);
      await GameBackupsFunction.sendResponse(event, context, error.message);
    }
  };

  //---------------------------------------------------------------------------
  // OBJECT ATTRIBUTES
  //---------------------------------------------------------------------------

  /**
   * AWS SDK EC2 client to use across the Lambda function
   */
  private ec2Client = new aws.EC2();

  //---------------------------------------------------------------------------
  // OBJECT FUNCTIONALITY
  //---------------------------------------------------------------------------

  /**
   * Execute the creation of game backups (i.e. EBS volume snapshots) across all
   * applicable EC2 instances in the given VPC.
   *
   * @param vpcId VPC containing the Minecraft game servers
   */
  private async backupGameServers(vpcId: string): Promise<void> {
    // gather EC2 instances from the VPC
    const params: aws.EC2.DescribeInstancesRequest = {
      Filters: [
        { Name: 'vpc-id', Values: [vpcId] },
      ],
    };
    const results = await this.ec2Client.describeInstances(params).promise();
    const reservations = results.Reservations ?? [];
    const instances: aws.EC2.Instance[] = reservations.flatMap(
      (reservation) => reservation.Instances as aws.EC2.InstanceList ?? [],
    );

    // stop the EC2 instances prior to creating EBS snapshots to avoid issues
    // with any pending file writes or cached data
    const instanceIds = instances.map((instance) => instance.InstanceId ?? '');
    console.log(`stopping all instances: ${instanceIds.toString()}`);
    await this.ec2Client.stopInstances({
      Force: true,
      InstanceIds: instanceIds,
    }).promise();

    // wait for the instance to stop then initiate the create snapshot task
    const snapshotIds: string[] = [];
    await Promise.all(instances.map(async (instance) => {
      const instanceId = instance.InstanceId as string;
      console.log(`creating snapshot for instance ${instanceId}`);
      await this.ec2Client.waitFor('instanceStopped', {
        InstanceIds: [instanceId],
      } as aws.EC2.DescribeInstancesRequest).promise();
      snapshotIds.push(
        await this.createSnapshot(instance),
      );
    }));
    console.log(`created snapshots: ${snapshotIds.toString()}`);

    // wait for all the snapshots to complete before returning
    // (to avoid resource contention on other CloudFormation events)
    await this.ec2Client.waitFor('snapshotCompleted', {
      SnapshotIds: snapshotIds,
    } as aws.EC2.DescribeSnapshotsRequest).promise();
  }

  /**
   * Create a snapshot of the attached EBS volume containing the Minecraft game data.
   *
   * @param instance EC2 instance running the Minecraft game server
   *
   * @returns Snapshot ID created during the operation
   */
  private async createSnapshot(instance: aws.EC2.Instance): Promise<string> {
    let snapshotId = '';

    // gather data to provide as inputs to the snapshot creation operation
    const instanceTags = instance.Tags ?? [];
    const snapshotTags = GameBackupsFunction.createSnapshotTags(instanceTags);
    const description = GameBackupsFunction.createDescription(snapshotTags.Tags ?? []);

    // create the snapshot after finding the appropriate volume
    const volumes = instance.BlockDeviceMappings ?? [];
    await Promise.all(volumes.map(async (volume) => {
      if (volume.Ebs && volume.DeviceName === '/dev/sdm') {
        const snapshot = await this.ec2Client.createSnapshot({
          VolumeId: volume.Ebs.VolumeId,
          Description: description,
          TagSpecifications: [snapshotTags],
        } as aws.EC2.CreateSnapshotRequest).promise();
        snapshotId = snapshot.SnapshotId ?? '';
      }
    }));

    return snapshotId;
  }

  //---------------------------------------------------------------------------
  // CLASS FUNCTIONALITY (HELPER FUNCTIONS)
  //---------------------------------------------------------------------------

  /**
   * Helper function to retrieve the value of a tag from the provided list of tags.
   *
   * @param tags List of tags using AWS's tag format
   * @param key Key associated with the desired tag value
   *
   * @returns Value associated with the provided key if found; otherwise ''
   */
  static getTagValue(tags: aws.EC2.TagList, key: string): string {
    const tag = tags.find((entry) => entry.Key === key);
    return tag && tag.Value ? tag.Value : '';
  }

  /**
   * Helper function to create a set of tags for the EBS volume.
   *
   * @param instanceTags Tags from the EC2 instance attached to the EBS volume
   *
   * @returns TagSpecification containing the derived EBS volume snapshot tags
   */
  static createSnapshotTags(instanceTags: aws.EC2.TagList): aws.EC2.TagSpecification {
    const application = GameBackupsFunction.getTagValue(instanceTags, 'Application');
    const environment = GameBackupsFunction.getTagValue(instanceTags, 'Environment');

    const instanceName = GameBackupsFunction.getTagValue(instanceTags, 'Name');
    const nameParts = instanceName.split('/');
    const gameDefName = nameParts.length > 1 ? nameParts[1] : '';

    const timestamp = Date.now();
    const dateString = new Date(timestamp).toISOString();

    const snapshotName = `${application}-${environment}-${gameDefName}-${timestamp}`;

    return {
      ResourceType: 'snapshot',
      Tags: [
        { Key: 'Application', Value: application },
        { Key: 'Environment', Value: environment },
        { Key: 'Name', Value: snapshotName },
        { Key: 'Server', Value: gameDefName },
        { Key: 'Event', Value: 'stack.update' },
        { Key: 'Timestamp', Value: dateString },
      ],
    };
  }

  /**
   * Helper function that creates a EBS volume snapshot 'description'.
   *
   * @param snapshotTags Tags associated with the EBS volume snapshot.
   *
   * @returns String containing the EBS volume snapshot 'description'
   */
  static createDescription(snapshotTags: aws.EC2.TagList): string {
    const serverName = GameBackupsFunction.getTagValue(snapshotTags, 'Server');
    const dateString = GameBackupsFunction.getTagValue(snapshotTags, 'Timestamp');
    return `Snapshot of '${serverName}' game server on ${dateString}`;
  }

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
export const { handler } = new GameBackupsFunction();
