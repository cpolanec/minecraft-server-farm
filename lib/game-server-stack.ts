/* eslint-disable no-template-curly-in-string */
import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as iam from '@aws-cdk/aws-iam';
import NetworkStack from './network-stack';
import AppParameters from './app-parameters';
import GameDataBackup from './game-backup-resource';
import GameServerDefinition from './game-server-def';

class GameServerStack extends cdk.NestedStack {
  //-------------------------------------------------------
  // CONSTRUCTORS & INITIALIZATION
  //-------------------------------------------------------

  constructor(
    scope: cdk.Construct,
    definition: GameServerDefinition,
    network: NetworkStack,
  ) {
    super(scope, definition.name);

    const latestImage: ec2.IMachineImage = ec2.MachineImage.latestAmazonLinux({
      generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      virtualization: ec2.AmazonLinuxVirt.HVM,
      cpuType: ec2.AmazonLinuxCpuType.ARM_64,
      storage: ec2.AmazonLinuxStorage.GENERAL_PURPOSE,
    });

    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      'yum upgrade --assumeyes',
      'yum install --assumeyes java-11-amazon-corretto-headless',
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
      'ExecStartPre=/usr/bin/wget https://papermc.io/api/v2/projects/paper/versions/1.16.5/builds/585/downloads/paper-1.16.5-585.jar -O minecraft.jar',
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

    const instance = new ec2.Instance(this, 'instance', {
      vpc: network.vpc,
      vpcSubnets: {
        subnets: [network.subnet],
      },
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.M6G, ec2.InstanceSize.MEDIUM),
      machineImage: latestImage,
      keyName: AppParameters.getInstance().getSSHKeyName(),
      securityGroup: network.securityGroup,
      role: iam.Role.fromRoleArn(this, 'ec2role', AppParameters.getInstance().getEC2RoleArn()),
      userData,
    });

    new ec2.CfnEIP(this, 'eip', {
      instanceId: instance.instanceId,
    });

    const volume = new ec2.Volume(this, 'volume', {
      volumeType: ec2.EbsDeviceVolumeType.GP2,
      availabilityZone: instance.instanceAvailabilityZone,
      snapshotId: definition.initSnapshot,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    new ec2.CfnVolumeAttachment(this, 'volumeAttachment', {
      instanceId: instance.instanceId,
      volumeId: volume.volumeId,
      device: '/dev/sdm',
    });
    new GameDataBackup(this, definition, volume);
  }
}

export default GameServerStack;
