import * as cdk from 'aws-cdk-lib';
import AppParameters from './app-parameters';

/**
 * Class that consolidates the generation of stack properties from various
 * sources (e.g. environment variables, provided stack name). This
 * consolidation allows for consistency across the application's various
 * stacks.
 */
export default class StackSpecification {
  //---------------------------------------------------------------------------
  // ATTRIBUTES
  //---------------------------------------------------------------------------

  private stackId: string;

  private stackProps: cdk.StackProps;

  //---------------------------------------------------------------------------
  // GETTERS & SETTERS
  //---------------------------------------------------------------------------

  public getStackId(): string {
    return this.stackId;
  }

  public getStackProps(): cdk.StackProps {
    return this.stackProps;
  }

  //---------------------------------------------------------------------------
  // CONSTRUCTORS & INITIALIZATION
  //---------------------------------------------------------------------------

  /**
   * @constructor
   * @param component Unique identifier to apply in the stack properties
   */
  constructor(component: string) {
    const params = AppParameters.getInstance();

    const qualifier = params.getQualifier();
    this.stackId = `${qualifier}-${params.getEnvironment()}-${component}`;

    const synthesizer = new cdk.DefaultStackSynthesizer({
      qualifier,
      fileAssetsBucketName: params.getS3BucketName(),
      bucketPrefix: this.stackId,
      deployRoleArn: params.getDeployRoleArn(),
      fileAssetPublishingRoleArn: params.getPublishRoleArn(),
      cloudFormationExecutionRole: params.getCloudFormationRoleArn(),
    });

    const tags = {
      Application: qualifier,
      Environment: params.getEnvironment(),
    };

    this.stackProps = {
      stackName: this.getStackId(),
      synthesizer,
      tags,
    };
  }
}
