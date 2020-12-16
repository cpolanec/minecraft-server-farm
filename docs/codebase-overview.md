# Codebase Overview

## Top-Level Folders

The project has three main components organized into their own directories:

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
- Property files containing the configuration data for each Minecraft game server in the server farm

Here is an example properties file that defines a Minecraft game server:

```properties
# ./servers/main/myserver.properties

gamedata.snapshot.id=snap-#################
launchtemplate.id.key=Template16aId
launchtemplate.version.key=Template16aVersion
```

## Development and Production Environments

The codebase provides the ability to test out changes/upgrades in isolation from end-users connected to a production environment. This flexibility is also used to test changes pushed to GitHub feature branches before they are merged to the `main` branch and deployed by the GitHub actions.

Each component will be deployed with tags that include the environment name (as defined by `ENVIRONMENT` variable defined on the host). For example, the networking component's VPC will have the following tags if `ENVIRONMENT=main`:

| Tag           | Value                |
| ------------- | -------------------- |
| `name`        | `minecraft-main-vpc` |
| `environment` | `main`               |

The `ENVIRONMENT` variable will also determine which server property files are used throughout the automation. For example, the following servers will be created if `ENVIRONMENT=main`:

| Properties Files             |     | EC2 Instance / Minecraft Game Server |
| ---------------------------- | --- | ------------------------------------ |
| `./main/mars.properties`     | ->  | `minecraft-server-main-mars`         |
| `./main/mercury.properties`  | ->  | `minecraft-server-main-mercury`      |
| `./main/venus.properties`    | ->  | `minecraft-server-main-venus`        |
| `./test/europa.properties`   | ->  | N/A                                  |
| `./test/ganymede.properties` | ->  | N/A                                  |
