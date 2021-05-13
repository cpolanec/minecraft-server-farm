import * as dotenv from 'dotenv';
import * as envvar from 'env-var';
import * as fs from 'fs';

/**
 * Singleton class that helps discover environment specific variables from the
 * following locations:
 *  1. '.env' file in the project root directory
 *  2. Environment variables in the local execution environment
 *
 * These locations can help provide flexibility for running the code on a
 * development machine or on a CI platform.
 *
 */
export default class AppParameters {
  //---------------------------------------------------------------------------
  // CLASS ATTRIBUTES
  //---------------------------------------------------------------------------

  private static instance: AppParameters;

  //---------------------------------------------------------------------------
  // OBJECT ATTRIBUTES
  //---------------------------------------------------------------------------

  private readonly qualifier: string;

  private readonly environment: string;

  private readonly s3bucketName: string;

  private readonly deployRoleArn: string;

  private readonly publishRoleArn: string;

  private readonly cloudFormationRoleArn: string;

  private readonly lambdaRoleArn: string;

  private readonly ec2RoleArn: string;

  private readonly sshKeyName: string;

  private readonly mcrconPasswordParameter: string;

  private readonly serverDefinitionSource: string;

  //---------------------------------------------------------------------------
  // GETTERS & SETTERS
  //---------------------------------------------------------------------------

  public getQualifier(): string {
    return this.qualifier;
  }

  public getEnvironment(): string {
    return this.environment;
  }

  public getS3BucketName(): string {
    return this.s3bucketName;
  }

  public getDeployRoleArn(): string {
    return this.deployRoleArn;
  }

  public getPublishRoleArn(): string {
    return this.publishRoleArn;
  }

  public getCloudFormationRoleArn(): string {
    return this.cloudFormationRoleArn;
  }

  public getLambdaRoleArn(): string {
    return this.lambdaRoleArn;
  }

  public getEC2RoleArn(): string {
    return this.ec2RoleArn;
  }

  public getSSHKeyName(): string {
    return this.sshKeyName;
  }

  public getMcrconPasswordParameter(): string {
    return this.mcrconPasswordParameter;
  }

  public getServerDefinitionSource(): string {
    return this.serverDefinitionSource;
  }

  //---------------------------------------------------------------------------
  // CONSTRUCTORS & INITIALIZATION
  //---------------------------------------------------------------------------

  /**
   * Returns the singleton instance and creates it if not defined already.
   *
   * @returns Singleton instance of this class
   */
  public static getInstance(): AppParameters {
    AppParameters.init('.env');
    return AppParameters.instance;
  }

  /**
   * Initialize the singleton instance if not already defined.
   *
   * @param envfile Path of file with environment variables
   */
  public static init(envfile?: string): void {
    if (!AppParameters.instance) {
      if (envfile && fs.existsSync(envfile)) {
        dotenv.config({ path: envfile });
      }
      AppParameters.instance = new AppParameters();
    }
  }

  private constructor() {
    this.qualifier = envvar
      .get('CDK_QUALIFIER')
      .default('mcservers')
      .asString();

    this.environment = envvar
      .get('ENVIRONMENT')
      .required()
      .asString();

    this.s3bucketName = envvar
      .get('S3_BUCKET_NAME')
      .required()
      .asString();

    this.deployRoleArn = envvar
      .get('DEPLOY_ROLE_ARN')
      .required()
      .asString();

    this.publishRoleArn = envvar
      .get('PUBLISH_ROLE_ARN')
      .required()
      .asString();

    this.cloudFormationRoleArn = envvar
      .get('CLOUDFORMATION_ROLE_ARN')
      .required()
      .asString();

    this.lambdaRoleArn = envvar
      .get('LAMBDA_ROLE_ARN')
      .required()
      .asString();

    this.ec2RoleArn = envvar
      .get('EC2_ROLE_ARN')
      .required()
      .asString();

    this.sshKeyName = envvar
      .get('SSH_KEY_NAME')
      .required()
      .asString();

    this.mcrconPasswordParameter = envvar
      .get('MCRCON_PASSWORD_PARAMETER')
      .default('/minecraft/mcrcon/password')
      .asString();

    this.serverDefinitionSource = envvar
      .get('SERVER_DEFINITION_SOURCE')
      .required()
      .asString();
  }
}
