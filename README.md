# Minecraft Server Farm ![sync-resources](https://github.com/cpolanec/minecraft-server-farm/workflows/sync-resources/badge.svg)

Resources for running Minecraft game servers on AWS EC2 servers. This project implements a [GitOps-style approach](https://www.atlassian.com/git/tutorials/gitops) with [GitHub Actions](https://github.com/features/actions) to manage the AWS infrastructure and the Minecraft game servers.

Take a look at the [Getting Started](./docs/GETTING-STARTED.md) guide if you are interested in running your own Minecraft Server Farm using these resources.

## How it all works

The project has three main components:

| Component   | Summary                                                                           |
| ----------- | --------------------------------------------------------------------------------- |
| `network`   | Contains VPC, subnet, routing, and security group definitions                     |
| `templates` | Contains EC2 launch templates to simplify EC2 instance definitions                |
| `servers`   | Contains property files that specify the characteristics of each game game server |

Each component has the following artifacts:

- Shell script for deploying/synchronizing resources (e.g. `sync-resources.sh`)
- Shell script for destroying resources (e.g. `destroy-resources.sh`)
- CloudFormation template that defines the cloud resources

The `servers` component also has the following artifacts:

- Shell script for creating backups of the Minecraft game data on the attached EBS volume
- Shell script for purging old game data backups (to prevent filling up the account with EBS volume snapshots)

The `servers` component also has directories which correspond to any environment names supplied in the deployment/synchronization automation. A Minecraft server will be created and named after each properties file in the environment directory. See table below for examples:

| Properties Files             |     | EC2 Instance / Minecraft Game Server |
| ---------------------------- | --- | ------------------------------------ |
| `./main/mars.properties`     | ->  | `minecraft-server-main-mars`         |
| `./main/mercury.properties`  | ->  | `minecraft-server-main-mercury`      |
| `./main/venus.properties`    | ->  | `minecraft-server-main-venus`        |
| `./test/europa.properties`   | ->  | `minecraft-server-test-europa`       |
| `./test/ganymede.properties` | ->  | `minecraft-server-test-ganymede`     |

All properties files defined in the `./servers/{environment}` directory contain the parameters needed to create/update Minecraft game servers. For example:

```properties
gamedata.snapshot.id=snap-#################
launchtemplate.id.key=Template16aId
launchtemplate.version.key=Template16aVersion
```

## How to make changes

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
