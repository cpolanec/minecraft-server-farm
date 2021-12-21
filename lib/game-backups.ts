import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import AppParameters from './app-parameters';

/**
 * Custom resources that create backups of the Minecraft game servers during
 * CloudFormation stack events. The intent is to create backups in the following
 * scenarios:
 *   - before resources are updated on stack 'Update' events
 *   - before resources are deleted on stack 'Delete' events
 *
 * Two Custom Resources are needed to handle these scenarios (one for each event
 * type). The 'onUpdate' Custom Resource should be added to the dependencies of
 * each GameServerStack so that it runs prior to any updates to the
 * GameServerStack resources. The 'onDelete' Custom Resource should be configured
 * to be dependent on the GameServerStack resources (forcing it to be invoked
 * prior to the deletion of the GameServerStack resources).)
 */
export default class GameBackups extends Construct {
  //---------------------------------------------------------------------------
  // OBJECT ATTRIBUTES
  //---------------------------------------------------------------------------

  onUpdates: cdk.CustomResource;

  onDeletes: cdk.CustomResource;

  //---------------------------------------------------------------------------
  // CONSTRUCTORS & INITIALIZATION
  //---------------------------------------------------------------------------
  constructor(scope: Construct, vpcId: string) {
    super(scope, 'GameBackups');

    const lambdaRole = cdk.aws_iam.Role.fromRoleArn(
      this, 'lambdaRole', AppParameters.getInstance().getLambdaRoleArn(),
    );

    // 'handler' directs this resource to the
    // 'game-backups.handler.ts' file
    const handler = new cdk.aws_lambda_nodejs.NodejsFunction(this, 'handler', {
      role: lambdaRole,
      retryAttempts: 0,
      timeout: cdk.Duration.minutes(5),
      logRetention: cdk.aws_logs.RetentionDays.ONE_MONTH,
      logRetentionRole: lambdaRole,
      bundling: {
        externalModules: ['aws-sdk'],
      },
    });

    this.onUpdates = new cdk.CustomResource(this, 'OnUpdates', {
      resourceType: 'Custom::GameBackups',
      serviceToken: handler.functionArn,
      properties: {
        OnEvent: 'Update',
        VpcId: vpcId,
        Timestamp: Date.now(), // always run
      },
    });

    this.onDeletes = new cdk.CustomResource(this, 'OnDeletes', {
      resourceType: 'Custom::GameBackups',
      serviceToken: handler.functionArn,
      properties: {
        OnEvent: 'Delete',
        VpcId: vpcId,
        Timestamp: Date.now(), // always run
      },
    });
  }
}
