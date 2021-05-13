# Codebase Overview

## CDK Application

The entry point for this CDK application is the [`bin/app.ts`](../bin/app.ts) file which will defines two CDK stacks:

- Network Stack ([`lib/network-stack.ts`](../lib/network-stack.ts))
- Server Farm Stack ([`lib/server-farm-stack.ts`](../lib/server-farm-stack.ts))

The CDK application will dynamically create nested stacks under the *Server Farm Stack* for each server definition file in the project.

## Server Definition Files

Minecraft servers will run on EC2 instances that are defined by JSON files in the location specified by the `SERVER_DEFINITION_SOURCE` environment variable. Here is an example JSON file that defines a Minecraft game server:

```json
{
    "name": "myserver",
    "initSnapshot": "snap-#################"
}
```

## Development and Production Environments

The codebase provides the ability to test out changes/upgrades in isolation from end-users connected to a production environment. This flexibility is also used to test changes pushed to GitHub feature branches before they are merged to the `main` branch and deployed by the GitHub actions.

Each component will be deployed with tags that include the environment name (as defined by `ENVIRONMENT` variable defined on the host). For example, the networking component's VPC will have the following tags if `ENVIRONMENT=main`:

| Tag           | Value                        |
| ------------- | ---------------------------- |
| `Application` | `mcservers`                  |
| `Name`        | `mcservers-main-network/vpc` |
| `Environment` | `main`                       |
