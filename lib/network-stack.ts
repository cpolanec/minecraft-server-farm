import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import StackSpecification from './stack-specification';

/**
 * Definition of a CloudFormation stack that represents the AWS networking
 * resources needed to run a fleet of EC2 instances for running Minecraft
 * game servers.
 */
class NetworkStack extends cdk.Stack {
  //---------------------------------------------------------------------------
  // CLASS ATTRIBUTES
  //---------------------------------------------------------------------------

  vpc: ec2.Vpc;

  subnet: ec2.Subnet;

  networkAcl: ec2.NetworkAcl;

  securityGroup: ec2.SecurityGroup;

  //---------------------------------------------------------------------------
  // CONSTRUCTORS & INITIALIZATION
  //---------------------------------------------------------------------------

  constructor(scope: cdk.Construct, spec: StackSpecification) {
    super(scope, spec.getStackId(), spec.getStackProps());

    //
    // VPC and subnet resources
    //
    this.vpc = new ec2.Vpc(this, 'vpc', {
      cidr: '10.0.0.0/16',
      enableDnsHostnames: false,
      maxAzs: 1,
      natGateways: 0,
      subnetConfiguration: [],
    });
    this.subnet = new ec2.PublicSubnet(this, 'subnet', {
      vpcId: this.vpc.vpcId,
      cidrBlock: '10.0.0.0/24',
      availabilityZone: this.vpc.availabilityZones[0],
    });
    const igw = new ec2.CfnInternetGateway(this, 'igw', {
      tags: [
        { key: 'Name', value: `${spec.getStackId()}/igw` },
      ],
    });
    const igwAttachment = new ec2.CfnVPCGatewayAttachment(this, 'igw-attachment', {
      vpcId: this.vpc.vpcId,
      internetGatewayId: igw.ref,
    });
    this.subnet.addDefaultInternetRoute(igw.ref, igwAttachment);

    //
    // Network Access Control List resources
    //
    this.networkAcl = new ec2.NetworkAcl(this, 'acl', {
      networkAclName: `${spec.getStackId()}/nacl`,
      vpc: this.vpc,
    });
    new ec2.SubnetNetworkAclAssociation(this, 'subnet-acl-association', {
      subnet: this.subnet,
      networkAcl: this.networkAcl,
    });
    new ec2.NetworkAclEntry(this, 'inbound-ephemeral', {
      // for 'yum' and 'wget' requests
      networkAcl: this.networkAcl,
      direction: ec2.TrafficDirection.INGRESS,
      ruleNumber: 100,
      ruleAction: ec2.Action.ALLOW,
      cidr: ec2.AclCidr.anyIpv4(),
      traffic: ec2.AclTraffic.tcpPortRange(32768, 65535),
    });
    new ec2.NetworkAclEntry(this, 'inbound-ssh', {
      networkAcl: this.networkAcl,
      direction: ec2.TrafficDirection.INGRESS,
      ruleNumber: 110,
      ruleAction: ec2.Action.ALLOW,
      cidr: ec2.AclCidr.anyIpv4(),
      traffic: ec2.AclTraffic.tcpPort(22),
    });
    new ec2.NetworkAclEntry(this, 'inbound-game-tcp', {
      networkAcl: this.networkAcl,
      direction: ec2.TrafficDirection.INGRESS,
      ruleNumber: 120,
      ruleAction: ec2.Action.ALLOW,
      cidr: ec2.AclCidr.anyIpv4(),
      traffic: ec2.AclTraffic.tcpPort(25565),
    });
    new ec2.NetworkAclEntry(this, 'inbound-game-udp', {
      networkAcl: this.networkAcl,
      direction: ec2.TrafficDirection.INGRESS,
      ruleNumber: 121,
      ruleAction: ec2.Action.ALLOW,
      cidr: ec2.AclCidr.anyIpv4(),
      traffic: ec2.AclTraffic.udpPort(25565),
    });
    new ec2.NetworkAclEntry(this, 'inbound-rcon', {
      networkAcl: this.networkAcl,
      direction: ec2.TrafficDirection.INGRESS,
      ruleNumber: 122,
      ruleAction: ec2.Action.ALLOW,
      cidr: ec2.AclCidr.anyIpv4(),
      traffic: ec2.AclTraffic.tcpPort(25575),
    });
    new ec2.NetworkAclEntry(this, 'outbound-allow-all', {
      networkAcl: this.networkAcl,
      direction: ec2.TrafficDirection.EGRESS,
      ruleNumber: 100,
      ruleAction: ec2.Action.ALLOW,
      cidr: ec2.AclCidr.anyIpv4(),
      traffic: ec2.AclTraffic.allTraffic(),
    });

    //
    // Security Group resources
    //
    this.securityGroup = new ec2.SecurityGroup(this, 'sg', {
      vpc: this.vpc,
      securityGroupName: `${spec.getStackId()}/sg`,
    });
    this.securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'SSH access to the virtual machines',
    );
    this.securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(), ec2.Port.tcp(25565), 'Minecraft server TCP port',
    );
    this.securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(), ec2.Port.udp(25565), 'Minecraft server UDP port',
    );
    this.securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(), ec2.Port.tcp(25575), 'Minecraft rcon TCP port',
    );
  }
}

export default NetworkStack;
