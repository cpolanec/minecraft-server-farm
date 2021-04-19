import fs from 'fs';
import path from 'path';
import * as cdk from '@aws-cdk/core';
import AppParameters from './app-parameters';
import StackSpecification from './stack-specification';
import GameServerDefinition from './game-server-def';
import GameServerStack from './game-server-stack';
import NetworkStack from './network-stack';

class ServerFarmStack extends cdk.Stack {
  //-------------------------------------------------------
  // CONSTRUCTORS & INITIALIZATION
  //-------------------------------------------------------

  constructor(
    scope: cdk.Construct,
    spec: StackSpecification,
    network: NetworkStack,
  ) {
    super(scope, spec.getStackId(), spec.getStackProps());

    const definitions: GameServerDefinition[] = [];

    const source = AppParameters.getInstance().getServerDefinitionSource();
    const sourceData = source.split('://');
    // const sourceType = sourceData[0];
    const directory = sourceData[1];

    const files = fs.readdirSync(directory);
    files.forEach((file) => {
      const jsonString = fs.readFileSync(path.join(directory, file)).toString();
      const serverDef = JSON.parse(jsonString) as GameServerDefinition;
      definitions.push(serverDef);
    });

    definitions.forEach((definition) => {
      new GameServerStack(this, definition, network);
    });
  }
}

export default ServerFarmStack;
