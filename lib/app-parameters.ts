import * as dotenv from 'dotenv';
import * as envvar from 'env-var';
import * as fs from 'fs';

class AppParameters {
  //-------------------------------------------------------
  // CLASS ATTRIBUTES
  //-------------------------------------------------------

  private static instance: AppParameters;

  //-------------------------------------------------------
  // OBJECT ATTRIBUTES
  //-------------------------------------------------------

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

  //-------------------------------------------------------
  // GETTERS & SETTERS
  //-------------------------------------------------------

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

  //-------------------------------------------------------
  // CONSTRUCTORS & INITIALIZATION
  //-------------------------------------------------------

  public static getInstance(): AppParameters {
    if (!AppParameters.instance) {
      if (fs.existsSync('.env')) {
        const result = dotenv.config();
        if (result.error) {
          throw result.error;
        }
      }
      AppParameters.instance = new AppParameters();
    }

    return AppParameters.instance;
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

export default AppParameters;
