import * as ec2 from '@aws-cdk/aws-ec2';
import * as iam from '@aws-cdk/aws-iam';
import * as cdk from '@aws-cdk/core';
import * as cr from '@aws-cdk/custom-resources';
import AppParameters from './app-parameters';
import GameServerDefinition from './game-server-def';

class GameDataBackup extends cdk.Construct {
  //-------------------------------------------------------
  // CONSTRUCTORS & INITIALIZATION
  //-------------------------------------------------------

  constructor(scope: cdk.Construct, definition: GameServerDefinition, volume: ec2.Volume) {
    super(scope, 'GameBackup');

    const params = AppParameters.getInstance();
    const qualifier = params.getQualifier();
    const environment = params.getEnvironment();
    const date = new Date().toISOString();
    const timestamp = Date.now();
    const name = `${qualifier}-${environment}-${definition.name}-${timestamp}`;

    const policy = cr.AwsCustomResourcePolicy.fromSdkCalls({
      resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE,
    });

    const lambdaRole = iam.Role.fromRoleArn(
      this, 'lambdaRole', params.getLambdaRoleArn(),
    );

    const sdkCall: cr.AwsSdkCall = {
      service: 'EC2',
      action: 'createSnapshot',
      physicalResourceId: cr.PhysicalResourceId.of(`${volume.volumeId}/snapshot`),
      parameters: {
        VolumeId: volume.volumeId,
        Description: `Snapshot of '${definition.name}' game server on ${date}`,
        TagSpecifications: [{
          ResourceType: 'snapshot',
          Tags: [
            { Key: 'Application', Value: params.getQualifier() },
            { Key: 'Environment', Value: params.getEnvironment() },
            { Key: 'Name', Value: name },
            { Key: 'Server', Value: definition.name },
            { Key: 'Event', Value: 'stack.update' },
            { Key: 'Timestamp', Value: date },
          ],
        }],
      },
    };

    new cr.AwsCustomResource(this, 'Actions', {
      policy,
      role: lambdaRole,
      onUpdate: sdkCall,
    });
  }
}

export default GameDataBackup;
