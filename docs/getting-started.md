# Creating Your Own Server Farm

Table of Contents:

1. [Install JavaScript packages](#install-javascript-packages)
1. [Preparing your AWS account](#preparing-your-aws-account)
1. [Setting up a local clone of the project](#setting-up-a-local-clone-of-the-project)
1. [Setting up a GitHub forked repository](#setting-up-a-github-forked-repository)
1. [Managing the components](#managing-the-components)

## Install JavaScript packages

This project uses Node Package Manager (NPM) to install the project dependencies. [Install NPM](https://www.npmjs.com/get-npm) then run the following command to complete this step:

```shell
> npm install
```

## Preparing your AWS account

Follow these steps to complete the one-time setup of your [AWS account](https://aws.amazon.com/premiumsupport/knowledge-center/create-and-activate-aws-account/):

1. **Create an S3 bucket for deployments.** The AWS CDK will require an S3 bucket to stage deployment artifacts.

1. **Create a parameter in the AWS Systems Manager.** The AWS CDK and provisioned EC2 instances are expecting the a password to be stored as a secure parameter in the AWS Systems Manager. By default, the CDK will assume the parameter to be stored with the `/minecraft/mcrcon/password` key. The parameter name can be changed by defining an environment variable `MCRCON_PASSWORD_PARAMETER` with an alternative name. For example:

    ```properties
    # .env file
    MCRCON_PASSWORD_PARAMETER=/path/to/my/parameter
    ```

1. **Configure IAM roles and policies.** Running the CDK commands in this project require the following IAM configurations...

    - Lambda service role with permission to create and tag EBS snapshots.
    - EC2 service role with permission to read the parameter defined in the previous step.
    - CloudFormation Service Role with the following permissions...
        - Read deployment artifacts from the S3 bucket defined earlier.
        - Deploy VPC components (e.g. subnets, security groups, internet gateway, NACL).
        - Deploy EC2 instances (including creating EBS volumes and Elastic IPs).
        - Create CloudFormation Custom Resources (including creating lambda functions and passing the Lambda service role to the Lambda function).
    - Role used to manage (create, update, & delete) the CloudFormation stacks of this application and pass the CloudFormation service role.
    - Role used to publish the deployment artifacts to the S3 deployment bucket created earlier.
    - User (who is authenticating with the AWS account and is able to assume to previous role.

1. **Create an EC2 SSH key pair.** See [AWS instructions](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-key-pairs.html#prepare-key-pair) for this one-time setup.

1. **Create an EBS snapshot.** An EBS snapshot is needed to initialize the volumes used for game data storage. Guidelines include...

    - Snapshot should be available in the region that will be running the EC2 instances.
    - Snapshot should be a EBS volume that has been `xfs` formatted without any files & folders.
    - Encryption is not currently supported.
    - See [AWS instructions](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ebs-creating-snapshot.html#ebs-create-snapshot) for detailed instructions.

1. **Configure the AWS CDK.** Please review the [Getting Started](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html) guide that is provided by AWS to configure the CDK according to your preferences. One important step is to [bootstrap the CDK project](https://docs.aws.amazon.com/cdk/latest/guide/bootstrapping.html). A [sample bootstrap template](./cdk-bootstrap.yml) has been provided which simplifies the CDK bootstrapping process for this application.

## Setting up a local clone of the project

Follow these steps to quickly get started with a clone of this repository:

1. **Define environment variables.** Review the table below for breakdown of environment variables that should be added to a `.env` file at the project root:

    | Name                      | Description                                                    |
    | ------------------------- | -------------------------------------------------------------- |
    | QUALIFIER                 | Optional (default is `mcservers`), used in AWS resource naming |
    | ENVIRONMENT               | Scope/tag resources with this name to avoid conflicts          |
    | DEPLOY_ROLE_ARN           | Role used to manage CloudFormation stacks                      |
    | PUBLISH_ROLE_ARN          | Role used to publish artifacts to S3 bucket                    |
    | CLOUDFORMATION_ROLE_ARN   | Service role to pass to CloudFormation                         |
    | LAMBDA_ROLE_ARN           | Service role to pass to Lambda Functions                       |
    | EC2_ROLE_ARN              | Service role to pass to EC2 instances                          |
    | SSH_KEY_NAME              | Name of the SSH key created in your AWS account                |
    | MCRCON_PASSWORD_PARAMETER | Optional (default is `/minecraft/mcrcon/password`)             |
    | SERVER_DEFINITION_SOURCE  | Source of the server definitions                               |

    ***

    ```properties
    # sample .env file

    ENVIRONMENT=test
    # MCRCON_PASSWORD_PARAMETER=/minecraft/mcrcon/password
    SERVER_DEFINITION_SOURCE=file://./servers/test

    S3_BUCKET_NAME=my-deployment-bucket
    SSH_KEY_NAME=some_ec2_ssh_key_name
    DEPLOY_ROLE_ARN=arn:aws:iam::############:role/my-deploy-role
    PUBLISH_ROLE_ARN=arn:aws:iam::############:role/my-publish-role
    CLOUDFORMATION_ROLE_ARN=arn:aws:iam::############:role/my-cloudformation-role
    LAMBDA_ROLE_ARN=arn:aws:iam::############:role/my-lambda-role
    EC2_ROLE_ARN=arn:aws:iam::############:role/my-ec2-role

    ```

1. **Understand the available commands.** [NPM scripts](https://docs.npmjs.com/cli/v7/using-npm/scripts) are used to define common project tasks.

    | Command           | Description                                              |
    | ----------------- | -------------------------------------------------------- |
    | `npm run clean`   | Clean up any generated files in the local workspace      |
    | `npm run build`   | Compile the project Typescript files                     |
    | `npm run watch`   | Continuously compile the project Typescript files        |
    | `npm run lint`    | Lint the project source code using `eslint`              |
    | `npm run test`    | Run the project unit test cases                          |
    | `npm run synth`   | Synthesize the CloudFormation artifacts from CDK source  |
    | `npm run deploy`  | Deploy the AWS resources defined in the CDK application  |
    | `npm run destroy` | Destroy the AWS resources defined in the CDK application |

## Setting up a GitHub forked repository

Follow these steps in addition to the previous section to quickly get started with a GitHub fork of this repository:

1. **Update the GitHub project secrets.** The GitHub Actions for this project require the following secrets to be created (see [GitHub instructions](https://docs.github.com/en/free-pro-team@latest/actions/reference/encrypted-secrets#creating-encrypted-secrets-for-a-repository)):

    | Name                    | Description                                                        |
    | ----------------------- | ------------------------------------------------------------------ |
    | AWS_ACCESS_KEY_ID       | Value passed to the `aws-actions/configure-aws-credentials` action |
    | AWS_SECRET_ACCESS_KEY   | Value passed to the `aws-actions/configure-aws-credentials` action |
    | DEPLOY_ROLE_ARN         | Role used to manage CloudFormation stacks                          |
    | PUBLISH_ROLE_ARN        | Role used to publish artifacts to S3 bucket                        |
    | CLOUDFORMATION_ROLE_ARN | Service role to pass to CloudFormation                             |
    | LAMBDA_ROLE_ARN         | Service role to pass to Lambda Functions                           |
    | EC2_ROLE_ARN            | Service role to pass to EC2 instances                              |
    | SSH_KEY_NAME            | Name of the SSH key created in your AWS account                    |

1. **Update the GitHub action workflow-level environment variables (if desired).** The GitHub Actions for this project require the following environment variables to be set at the top of the `.github/workflows/sync-resources` file (the secret references do not need to be modified):

    ```yaml
    env:
        AWS_REGION: us-east-1
        DEPLOY_ROLE_ARN: ${{ secrets.DEPLOY_ROLE_ARN }}
        PUBLISH_ROLE_ARN: ${{ secrets.PUBLISH_ROLE_ARN }}
        CLOUDFORMATION_ROLE_ARN: ${{ secrets.CLOUDFORMATION_ROLE_ARN }}
        LAMBDA_ROLE_ARN: ${{ secrets.LAMBDA_ROLE_ARN }}
        EC2_ROLE_ARN: ${{ secrets.EC2_ROLE_ARN }}
        SSH_KEY_NAME: ${{ secrets.AWS_SSH_KEY_NAME }}
    ```

1. **Update the GitHub action branch-level environment variables (if desired).** The GitHub Action `init` job will evaluate the branch name currently checked-out to define environment variables associated with the branch (i.e. to support testing in CloudFormation stacks separate from active game servers).

    ```yaml
    steps:
        - name: Set environment variables based on git branch
          id: setenv
          run: |
              if [[ "${{github.ref}}" == "ref/heads/main" ]]; then
                echo "::set-output name=environment::main"
                echo "::set-output name=server_def_source::file://./servers/main"
              else
                echo "::set-output name=environment::test"
                echo "::set-output name=server_def_source::file://./servers/test"
              fi
    ```

## Managing the components

### Changes to Networking components

Networking resources should not require maintenance of any kind. If changes are desired, caution should be taken to see if those changes would require resource replacement rather than updating (see [AWS documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-updating-stacks-update-behaviors.html) for more details). Resource replacement may result in disruption of the entire solution.

### Changes to the EC2 instances

Creating or deleting games servers is as simple as adding or removing new property files, respectively, to the desired environment directory.

The `gamedata.snapshot.id` provides a lot of options for modifying game servers. Game progress can be saved off by creating a new EBS snapshot and using the associated snapshot ID in the following ways:

- updating the `gamedata.snapshot.id` in an existing property file to recover a prior game state
- using the snapshot ID in a new property file to start new minecraft world (also equivalent to renaming a game server)
- using the snapshot ID in a new property file to test a new EC2 Launch Template
