# Creating Your Own Server Farm

Table of Contents:

1. [Preparing your AWS account](#preparing-your-aws-account)
1. [Setting up a local clone of the project](#setting-up-a-local-clone-of-the-project)
1. [Setting up a GitHub forked repository](#setting-up-a-github-forked-repository)
1. [Managing the components](#managing-the-components)

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
    | GAME_DATA_BACKUP_COUNT   | Number of snapshots per game server to retain                            |
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

    GAME_DATA_BACKUP_COUNT=3
    MINECRAFT_RCON_PASSWORD=some_rcon_password
    ```

1. **Understand the available commands.** [GNU Make](https://www.gnu.org/software/make/manual/make.html) commands are available to simplify the project's command interface and script usage.

    | Command           | Description                                                    |
    | ----------------- | -------------------------------------------------------------- |
    | `make`            | Default action is to trigger `backups` and `servers` targets   |
    | `make servers`    | Create the Minecraft game servers and all dependencies         |
    | `make backups`    | Create snapshots of attached volumes containing game data      |
    | `make templates`  | Create the Minecraft EC2 Launch Templates and all dependencies |
    | `make network`    | Create the Minecraft networking foundation                     |
    | `make clean`      | Clean up any generated files in the local workspace            |
    | `make destroy`    | Delete remote resources except network (useful in testing)     |
    | `make destroyall` | Delete all remote resources (useful in testing)                |
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
                echo "::set-output name=environment::main"
                echo "::set-output name=network_stack_name::minecraft-main-network"
                echo "::set-output name=templates_stack_name::minecraft-main-ec2templates"
                echo "::set-output name=game_data_backup_count::3"
              else
                echo "::set-output name=environment::test"
                echo "::set-output name=network_stack_name::minecraft-test-network"
                echo "::set-output name=templates_stack_name::minecraft-test-ec2templates"
                echo "::set-output name=game_data_backup_count::1"
              fi
    ```

## Managing the components

### Changes to Networking components

Networking resources should not require maintenance of any kind. If changes are desired, caution should be taken to see if those changes would require resource replacement rather than updating (see [AWS documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-updating-stacks-update-behaviors.html) for more details). Resource replacement may result in disruption of the entire solution.

### Changes to EC2 Launch Templates

EC2 Launch Templates support automatic versioning so ordinary maintenance can be applied to the existing launch template resource definition(s). These changes will be automatically applied to any game servers referencing the updated Launch Template(s). Examples of ordinary maintenance are the following:

- updating the AMI to latest version
- updating Minecraft binary file to latest minor release or patch
- updating Java runtime flags for performance optimizations

Major changes to the EC2 Launch Templates should be implemented by creating a new EC2 Launch Template rather than updating an existing launch template. Game Servers can upgrade to the new EC2 Launch Template by updating the `launchtemplate.id.key` property in the game server's property file. Examples of major changes are the following:

- updating Minecraft binary file to the latest major release
- modifying the EC2 instance type

### Changes to game servers

Creating or deleting games servers is as simple as adding or removing new property files, respectively, to the desired environment directory.

The `gamedata.snapshot.id` provides a lot of options for modifying game servers. Game progress can be saved off by creating a new EBS snapshot and using the associated snapshot ID in the following ways:

- updating the `gamedata.snapshot.id` in an existing property file to recover a prior game state
- using the snapshot ID in a new property file to start new minecraft world (also equivalent to renaming a game server)
- using the snapshot ID in a new property file to test a new EC2 Launch Template
