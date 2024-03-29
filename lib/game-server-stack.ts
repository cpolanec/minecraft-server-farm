/* eslint-disable no-template-curly-in-string */
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import NetworkStack from './network-stack';
import AppParameters from './app-parameters';
import GameServerDefinition, { MC_DEFAULT_VERSION } from './game-server-def';
import PaperMCApiClient from './papermc-api-client';

/**
 * Definition of a nested CloudFormation stack that contains the AWS resources
 * needed to run a single Minecraft Game Server (e.g. EIP, EC2 instance, EBS
 * volume, etc).
 */
class GameServerStack extends cdk.NestedStack {
  //---------------------------------------------------------------------------
  // CONSTRUCTORS & INITIALIZATION
  //---------------------------------------------------------------------------

  public static create = async (
    scope: Construct,
    definition: GameServerDefinition,
    network: NetworkStack,
    volumeAttacher: cdk.aws_lambda_nodejs.NodejsFunction,
  ): Promise<GameServerStack> => {
    const papermcInfo = definition.papermc || {};
    const version = papermcInfo.version || MC_DEFAULT_VERSION;
    const build = papermcInfo.build || await PaperMCApiClient.gatherLatestBuildNumber(version);
    const downloadUrl = await PaperMCApiClient.createDownloadUrl(version, build);

    return new GameServerStack(scope, definition, network, volumeAttacher, downloadUrl);
  };

  private constructor(
    scope: Construct,
    definition: GameServerDefinition,
    network: NetworkStack,
    volumeAttacher: cdk.aws_lambda_nodejs.NodejsFunction,
    downloadUrl: string,
  ) {
    super(scope, definition.name);

    const latestImage: cdk.aws_ec2.IMachineImage = cdk.aws_ec2.MachineImage.latestAmazonLinux({
      generation: cdk.aws_ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      virtualization: cdk.aws_ec2.AmazonLinuxVirt.HVM,
      cpuType: cdk.aws_ec2.AmazonLinuxCpuType.ARM_64,
      storage: cdk.aws_ec2.AmazonLinuxStorage.GENERAL_PURPOSE,
    });

    const userData = cdk.aws_ec2.UserData.forLinux();
    userData.addCommands(
      'rpm --import https://yum.corretto.aws/corretto.key',
      'curl -L -o /etc/yum.repos.d/corretto.repo https://yum.corretto.aws/corretto.repo',
      'yum upgrade --assumeyes',
      'yum install --assumeyes java-17-amazon-corretto-devel',
    );
    userData.addCommands(
      'mkdir /mnt/minecraft',
      'echo "/dev/sdm /mnt/minecraft xfs defaults,nofail 0 2" >> /etc/fstab',
      'mount --all',
    );
    userData.addCommands(
      'mkdir /home/ec2-user/.aws',
      'chown ec2-user:ec2-user /home/ec2-user/.aws',
      'cat << EOF > /home/ec2-user/.aws/config',
      '[default]',
      `region=${this.region}`,
      'EOF',
      'chown ec2-user:ec2-user /home/ec2-user/.aws/config',
      'cat << EOF > /home/ec2-user/.aws/credentials',
      '[default]',
      `role_arn=${AppParameters.getInstance().getEC2RoleArn()}`,
      'credential_source=Ec2InstanceMetadata',
      'EOF',
      'chown ec2-user:ec2-user /home/ec2-user/.aws/credentials',
    );

    const paramName = AppParameters.getInstance().getMcrconPasswordParameter();
    const ssmCommand = `aws ssm get-parameter --with-decryption --name ${paramName} --query Parameter.Value --output text`;
    userData.addCommands(
      'cat << "EOF" > /mnt/minecraft/config-minecraft-props.sh',
      '#!/bin/sh -e',
      '',
      'minecraft_dir=/mnt/minecraft',
      'echo eula=true > ${minecraft_dir}/eula.txt',
      '',
      'propfile_path=${minecraft_dir}/server.properties',
      '[ ! -f ${propfile_path} ] && echo "" > ${propfile_path}',
      '',
      'set_property() {',
      '  prop=$1',
      '  value=$2',
      '  if grep -q "^[#]*\\s*${prop}=.*" ${propfile_path}; then',
      '    sed -i\'\' "s/^[#]*\\s*${prop}=.*/${prop}=${value}/" ${propfile_path}',
      '  else',
      '    echo ${prop}=${value} >> ${propfile_path}',
      '  fi',
      '}',
      '',
      'set_property enable-rcon true',
      `set_property rcon.password $(${ssmCommand})`,
      'set_property white-list true',
      'set_property enforce-whitelist true',
      'set_property enable-command-block true',
      'EOF',
      'chmod +x /mnt/minecraft/config-minecraft-props.sh',
      'chown ec2-user:ec2-user /mnt/minecraft/config-minecraft-props.sh',
    );

    userData.addCommands(
      'cat << EOF > /etc/systemd/system/minecraft.service',
      '[Unit]',
      'Description=Minecraft game server',
      'After=network.target',
      'Requires=mnt-minecraft.mount',
      '',
      '[Service]',
      'Type=simple',
      'User=ec2-user',
      'WorkingDirectory=/mnt/minecraft',
      'ExecStartPre=/usr/bin/sudo /usr/bin/chown ec2-user:ec2-user /mnt/minecraft',
      `ExecStartPre=/usr/bin/wget ${downloadUrl} -O minecraft.jar`,
      'ExecStartPre=/mnt/minecraft/config-minecraft-props.sh',
      'ExecStart=/usr/bin/java -Xmx2G -Xmx2G -jar minecraft.jar --noconsole',
      'Restart=always',
      'RestartSec=30',
      'SuccessExitStatus=0 143',
      '',
      '[Install]',
      'WantedBy=multi-user.target',
      'EOF',
      'systemctl enable minecraft.service',
      'systemctl start minecraft.service',
    );

    const instance = new cdk.aws_ec2.Instance(this, 'instance', {
      vpc: network.vpc,
      vpcSubnets: {
        subnets: [network.subnet],
      },
      instanceType: cdk.aws_ec2.InstanceType.of(cdk.aws_ec2.InstanceClass.M6G, cdk.aws_ec2.InstanceSize.MEDIUM),
      machineImage: latestImage,
      keyName: AppParameters.getInstance().getSSHKeyName(),
      securityGroup: network.securityGroup,
      role: cdk.aws_iam.Role.fromRoleArn(this, 'ec2role', AppParameters.getInstance().getEC2RoleArn()),
      userData,
      userDataCausesReplacement: true,
    });

    new cdk.aws_ec2.CfnEIP(this, 'eip', {
      instanceId: instance.instanceId,
    });

    const volume = new cdk.aws_ec2.Volume(this, 'volume', {
      volumeType: cdk.aws_ec2.EbsDeviceVolumeType.GP2,
      availabilityZone: instance.instanceAvailabilityZone,
      snapshotId: definition.initSnapshot,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    new cdk.CustomResource(this, 'volumeAttachment', {
      resourceType: 'Custom::VolumeAttachment',
      serviceToken: volumeAttacher.functionArn,
      properties: {
        InstanceId: instance.instanceId,
        VolumeId: volume.volumeId,
      },
    });
  }
}

export default GameServerStack;
