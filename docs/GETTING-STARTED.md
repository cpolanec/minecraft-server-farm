# Creating Your Own Server Farm

## Preparing your AWS account

Follow these steps to complete the one-time setup of your [AWS account](https://aws.amazon.com/premiumsupport/knowledge-center/create-and-activate-aws-account/):

1. **Configure IAM roles and policies.** Running the operational scripts in this project require the following IAM configurations...

    - User (who is authenticating with the AWS account and is associated with the role(s) described below).
    - Role (with permissions to run EC2 start/stop/restart commands, EBS volume attach/detach commands, and pass roles)
    - Service Role for CloudFormation (with permissions to deploy VPC components, EC2 Launch Templates, and EC2 instances)

1. **Create an EC2 SSH key pair.** See [AWS instructions](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-key-pairs.html#prepare-key-pair) for this one-time setup.

1. **Create an EBS snapshot.** An EBS snapshot is needed to initialize the volumes used for game data storage. Guidelines include...

    - Snapshot should be available in the region that will be running the EC2 instances.
    - Snapshot should be a EBS volume that has been `xfs` formatted without any files & folders.
    - Encryption is not currently supported.
    - See [AWS instructions](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ebs-creating-snapshot.html#ebs-create-snapshot) for detailed instructions.

## Setting up a local clone of the project

Follow these steps to quickly get started with a clone of this repository:

1. **Define environment variables.** Review the table below for breakdown of environment variables that should be added to a `.env` file at the project root:

    | Name                     | Description                                                              |
    | ------------------------ | ------------------------------------------------------------------------ |
    | ENVIRONMENT              | Scope/tag resources with this name to avoid conflicts                    |
    | NETWORK_STACK_NAME       | Name for the CloudFormation stack that deploys the networking components |
    | EC2_TEMPLATES_STACK_NAME | Name for the CloudFormation stack that deploys the EC2 Launch Templates  |
    | CLOUDFORMATION_ROLE_ARN  | Service role to pass to CloudFormation                                   |
    | SSH_KEY_NAME             | Name of the SSH key created in your AWS account                          |
    | MINECRAFT_RCON_PASSWORD  | Password to provide Minecraft server for rcon protocol connection        |

    ***

    ```properties
    # sample .env file

    ENVIRONMENT=test
    NETWORK_STACK_NAME=minecraft-network-test
    EC2_TEMPLATES_STACK_NAME=minecraft-ec2templates-test

    CLOUDFORMATION_ROLE_ARN=arn:aws:iam::############:role/some_cloudformation_service_role
    SSH_KEY_NAME=some_ec2_ssh_key_name

    MINECRAFT_RCON_PASSWORD=some_rcon_password
    ```

1. **Understand the available commands.** [GNU Make](https://www.gnu.org/software/make/manual/make.html) commands are available to simplify the project's command interface and script usage.

    | Command           | Description                                                    |
    | ----------------- | -------------------------------------------------------------- |
    | `make servers`    | Create the Minecraft game servers and all dependencies         |
    | `make templates`  | Create the Minecraft EC2 Launch Templates and all dependencies |
    | `make network`    | Create the Minecraft networking foundation                     |
    | `make clean`      | Clean up any generated files in the local workspace            |
    | `make destroy`    | Delete all remote resources (useful in testing)                |
    | `make .gitignore` | Make the `.gitignore` file using gitignore.io file generation  |

## Setting up a GitHub forked repository

Follow these steps to quickly get started with a GitHub fork of this repository:

1. **Update the GitHub project secrets.** The GitHub Actions for this project require the following secrets to be created (see [GitHub instructions](https://docs.github.com/en/free-pro-team@latest/actions/reference/encrypted-secrets#creating-encrypted-secrets-for-a-repository)):

    | Name                        | Description                                                        |
    | --------------------------- | ------------------------------------------------------------------ |
    | AWS_ACCESS_KEY_ID           | Value passed to the `aws-actions/configure-aws-credentials` action |
    | AWS_SECRET_ACCESS_KEY       | Value passed to the `aws-actions/configure-aws-credentials` action |
    | AWS_CLOUDFORMATION_ROLE_ARN | Service role to pass to CloudFormation                             |
    | AWS_SSH_KEY_NAME            | Name of the SSH key created in your AWS account                    |
    | MINECRAFT_RCON_PASSWORD     | Password to provide Minecraft server for rcon protocol connection  |

1. **Update the GitHub action workflow-level environment variables (if desired).** The GitHub Actions for this project require the following environment variables to be set at the top of the `.github/workflows/sync-resources` file (the secret references do not need to be modified):

    ```yaml
    env:
        AWS_REGION: us-east-1
        CLOUDFORMATION_ROLE_ARN: ${{ secrets.AWS_CLOUDFORMATION_ROLE_ARN }}
        SSH_KEY_NAME: ${{ secrets.AWS_SSH_KEY_NAME }}
        MINECRAFT_RCON_PASSWORD: ${{ secrets.MINECRAFT_RCON_PASSWORD }}
    ```

1. **Update the GitHub action branch-level environment variables (if desired).** The GitHub Action `init` job will evaluate the branch name currently checked-out to define environment variables associated with the branch (i.e. to support testing in CloudFormation stacks separate from active game servers).

    ```yaml
    steps:
        - name: Set environment variables based on git branch
          id: setenv
          run: |
              if [[ "${{github.ref}}" == "ref/heads/main" ]]; then
                echo "ENVIRONMENT=main" >> $GITHUB_ENV
                echo "NETWORK_STACK_NAME=minecraft-network-main" >> $GITHUB_ENV
                echo "EC2_TEMPLATES_STACK_NAME=minecraft-ec2templates-main" >> $GITHUB_ENV
              else
                echo "ENVIRONMENT=test" >> $GITHUB_ENV
                echo "NETWORK_STACK_NAME=minecraft-network-test" >> $GITHUB_ENV
                echo "EC2_TEMPLATES_STACK_NAME=minecraft-ec2templates-test" >> $GITHUB_ENV
              fi
    ```
