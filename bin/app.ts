#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import NetworkStack from '../lib/network-stack';
import ServerFarmStack from '../lib/server-farm-stack';
import StackSpecification from '../lib/stack-specification';

const app = new cdk.App();

const networkStackSpec = new StackSpecification('network');
const networkStack = new NetworkStack(app, networkStackSpec);

const serversStackSpec = new StackSpecification('hosts');
new ServerFarmStack(app, serversStackSpec, networkStack);
