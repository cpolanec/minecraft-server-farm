import {
  arrayWith, expect, haveResource, haveResourceLike, objectLike,
} from '@aws-cdk/assert';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as cdk from '@aws-cdk/core';
import AppParameters from '../lib/app-parameters';
import NetworkStack from '../lib/network-stack';
import StackSpecification from '../lib/stack-specification';

let stack: NetworkStack;

beforeAll(() => {
  AppParameters.init('test/.env.testing');
  const app = new cdk.App();
  const spec = new StackSpecification('network');
  stack = new NetworkStack(app, spec);
});

test('validate network has a subnet', () => {
  expect(stack).to(haveResource('AWS::EC2::VPC'));
  expect(stack).to(haveResource('AWS::EC2::Subnet'));
});

test('validate network has an internet gateway', () => {
  expect(stack).to(haveResource('AWS::EC2::InternetGateway'));
  expect(stack).to(haveResource('AWS::EC2::VPCGatewayAttachment'));
});

test('validate network has an ACL', () => {
  expect(stack).to(haveResource('AWS::EC2::NetworkAcl'));
  expect(stack).to(haveResource('AWS::EC2::SubnetNetworkAclAssociation'));
});

test('validate network allows ephemeral port access', () => {
  expect(stack).to(haveResourceLike('AWS::EC2::NetworkAclEntry', {
    Egress: false,
    RuleAction: ec2.Action.ALLOW,
    Protocol: 6, // TCP
    PortRange: {
      From: 32768,
      To: 65535,
    },
  }));
});

test('validate network allows SSH access', () => {
  expect(stack).to(haveResourceLike('AWS::EC2::NetworkAclEntry', {
    Egress: false,
    RuleAction: ec2.Action.ALLOW,
    Protocol: 6, // TCP
    PortRange: {
      From: 22,
      To: 22,
    },
  }));
  expect(stack).to(haveResourceLike('AWS::EC2::SecurityGroup', {
    SecurityGroupIngress: arrayWith(objectLike(
      {
        IpProtocol: 'tcp',
        FromPort: 22,
        ToPort: 22,
        CidrIp: '0.0.0.0/0',
      },
    )),
  }));
});

test('validate network allows Minecraft client access', () => {
  expect(stack).to(haveResourceLike('AWS::EC2::NetworkAclEntry', {
    Egress: false,
    RuleAction: ec2.Action.ALLOW,
    Protocol: 6, // TCP
    PortRange: {
      From: 25565,
      To: 25565,
    },
  }));
  expect(stack).to(haveResourceLike('AWS::EC2::NetworkAclEntry', {
    Egress: false,
    RuleAction: ec2.Action.ALLOW,
    Protocol: 17, // UDP
    PortRange: {
      From: 25565,
      To: 25565,
    },
  }));
  expect(stack).to(haveResourceLike('AWS::EC2::SecurityGroup', {
    SecurityGroupIngress: arrayWith(objectLike(
      {
        IpProtocol: 'tcp',
        FromPort: 25565,
        ToPort: 25565,
        CidrIp: '0.0.0.0/0',
      },
    )),
  }));
  expect(stack).to(haveResourceLike('AWS::EC2::SecurityGroup', {
    SecurityGroupIngress: arrayWith(objectLike(
      {
        IpProtocol: 'udp',
        FromPort: 25565,
        ToPort: 25565,
        CidrIp: '0.0.0.0/0',
      },
    )),
  }));
});

test('validate network allows mcrcon access', () => {
  expect(stack).to(haveResourceLike('AWS::EC2::NetworkAclEntry', {
    Egress: false,
    RuleAction: ec2.Action.ALLOW,
    Protocol: 6, // TCP
    PortRange: {
      From: 25575,
      To: 25575,
    },
  }));
  expect(stack).to(haveResourceLike('AWS::EC2::SecurityGroup', {
    SecurityGroupIngress: arrayWith(objectLike(
      {
        IpProtocol: 'tcp',
        FromPort: 25575,
        ToPort: 25575,
        CidrIp: '0.0.0.0/0',
      },
    )),
  }));
});

test('validate network allows outbound internet access', () => {
  expect(stack).to(haveResourceLike('AWS::EC2::NetworkAclEntry', {
    Egress: true,
    RuleAction: ec2.Action.ALLOW,
    Protocol: -1,
  }));
});
