import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
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

  vpc: cdk.aws_ec2.Vpc;

  subnet: cdk.aws_ec2.Subnet;

  networkAcl: cdk.aws_ec2.NetworkAcl;

  securityGroup: cdk.aws_ec2.SecurityGroup;

  //---------------------------------------------------------------------------
  // CONSTRUCTORS & INITIALIZATION
  //---------------------------------------------------------------------------

  constructor(scope: Construct, spec: StackSpecification) {
    super(scope, spec.getStackId(), spec.getStackProps());

    //
    // VPC and subnet resources
    //
    this.vpc = new cdk.aws_ec2.Vpc(this, 'vpc', {
      cidr: '10.0.0.0/16',
      enableDnsHostnames: false,
      maxAzs: 1,
      natGateways: 0,
      subnetConfiguration: [],
    });
    this.subnet = new cdk.aws_ec2.PublicSubnet(this, 'subnet', {
      vpcId: this.vpc.vpcId,
      cidrBlock: '10.0.0.0/24',
      availabilityZone: this.vpc.availabilityZones[0],
    });
    const igw = new cdk.aws_ec2.CfnInternetGateway(this, 'igw', {
      tags: [
        { key: 'Name', value: `${spec.getStackId()}/igw` },
      ],
    });
    const igwAttachment = new cdk.aws_ec2.CfnVPCGatewayAttachment(this, 'igw-attachment', {
      vpcId: this.vpc.vpcId,
      internetGatewayId: igw.ref,
    });
    this.subnet.addDefaultInternetRoute(igw.ref, igwAttachment);

    //
    // Network Access Control List resources
    //
    this.networkAcl = new cdk.aws_ec2.NetworkAcl(this, 'acl', {
      networkAclName: `${spec.getStackId()}/nacl`,
      vpc: this.vpc,
    });
    new cdk.aws_ec2.SubnetNetworkAclAssociation(this, 'subnet-acl-association', {
      subnet: this.subnet,
      networkAcl: this.networkAcl,
    });
    new cdk.aws_ec2.NetworkAclEntry(this, 'inbound-ephemeral', {
      // for 'yum' and 'wget' requests
      networkAcl: this.networkAcl,
      direction: cdk.aws_ec2.TrafficDirection.INGRESS,
      ruleNumber: 100,
      ruleAction: cdk.aws_ec2.Action.ALLOW,
      cidr: cdk.aws_ec2.AclCidr.anyIpv4(),
      traffic: cdk.aws_ec2.AclTraffic.tcpPortRange(32768, 65535),
    });
    new cdk.aws_ec2.NetworkAclEntry(this, 'inbound-ssh', {
      networkAcl: this.networkAcl,
      direction: cdk.aws_ec2.TrafficDirection.INGRESS,
      ruleNumber: 110,
      ruleAction: cdk.aws_ec2.Action.ALLOW,
      cidr: cdk.aws_ec2.AclCidr.anyIpv4(),
      traffic: cdk.aws_ec2.AclTraffic.tcpPort(22),
    });
    new cdk.aws_ec2.NetworkAclEntry(this, 'inbound-game-tcp', {
      networkAcl: this.networkAcl,
      direction: cdk.aws_ec2.TrafficDirection.INGRESS,
      ruleNumber: 120,
      ruleAction: cdk.aws_ec2.Action.ALLOW,
      cidr: cdk.aws_ec2.AclCidr.anyIpv4(),
      traffic: cdk.aws_ec2.AclTraffic.tcpPort(25565),
    });
    new cdk.aws_ec2.NetworkAclEntry(this, 'inbound-game-udp', {
      networkAcl: this.networkAcl,
      direction: cdk.aws_ec2.TrafficDirection.INGRESS,
      ruleNumber: 121,
      ruleAction: cdk.aws_ec2.Action.ALLOW,
      cidr: cdk.aws_ec2.AclCidr.anyIpv4(),
      traffic: cdk.aws_ec2.AclTraffic.udpPort(25565),
    });
    new cdk.aws_ec2.NetworkAclEntry(this, 'inbound-rcon', {
      networkAcl: this.networkAcl,
      direction: cdk.aws_ec2.TrafficDirection.INGRESS,
      ruleNumber: 122,
      ruleAction: cdk.aws_ec2.Action.ALLOW,
      cidr: cdk.aws_ec2.AclCidr.anyIpv4(),
      traffic: cdk.aws_ec2.AclTraffic.tcpPort(25575),
    });
    new cdk.aws_ec2.NetworkAclEntry(this, 'outbound-allow-all', {
      networkAcl: this.networkAcl,
      direction: cdk.aws_ec2.TrafficDirection.EGRESS,
      ruleNumber: 100,
      ruleAction: cdk.aws_ec2.Action.ALLOW,
      cidr: cdk.aws_ec2.AclCidr.anyIpv4(),
      traffic: cdk.aws_ec2.AclTraffic.allTraffic(),
    });

    //
    // Security Group resources
    //
    this.securityGroup = new cdk.aws_ec2.SecurityGroup(this, 'sg', {
      vpc: this.vpc,
      securityGroupName: `${spec.getStackId()}/sg`,
    });
    this.securityGroup.addIngressRule(
      cdk.aws_ec2.Peer.anyIpv4(),
      cdk.aws_ec2.Port.tcp(22),
      'SSH access to the virtual machines',
    );
    this.securityGroup.addIngressRule(
      cdk.aws_ec2.Peer.anyIpv4(),
      cdk.aws_ec2.Port.tcp(25565),
      'Minecraft server TCP port',
    );
    this.securityGroup.addIngressRule(
      cdk.aws_ec2.Peer.anyIpv4(),
      cdk.aws_ec2.Port.udp(25565),
      'Minecraft server UDP port',
    );
    this.securityGroup.addIngressRule(
      cdk.aws_ec2.Peer.anyIpv4(),
      cdk.aws_ec2.Port.tcp(25575),
      'Minecraft rcon TCP port',
    );
  }
}

export default NetworkStack;
