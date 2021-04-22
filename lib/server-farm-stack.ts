import fs from 'fs';
import path from 'path';
import * as cdk from '@aws-cdk/core';
import AppParameters from './app-parameters';
import StackSpecification from './stack-specification';
import GameServerDefinition, { GameServerDefinitionFile } from './game-server-def';
import GameServerStack from './game-server-stack';
import NetworkStack from './network-stack';

export default class ServerFarmStack extends cdk.Stack {
  //---------------------------------------------------------------------------
  // OBJECT ATTRIBUTES
  //---------------------------------------------------------------------------

  gameServerStacks: GameServerStack[];

  //---------------------------------------------------------------------------
  // CONSTRUCTORS & INITIALIZATION
  //---------------------------------------------------------------------------

  constructor(
    scope: cdk.Construct,
    spec: StackSpecification,
    network: NetworkStack,
  ) {
    super(scope, spec.getStackId(), spec.getStackProps());

    //
    // parse the server definition source (i.e. location of server definitions)
    //
    const source = AppParameters.getInstance().getServerDefinitionSource();
    const sourceData = source.split('://');
    // const sourceType = sourceData[0]; NOT YET...
    const sourcePath = sourceData[1];

    //
    // gather the Game Server definitions
    //
    const definitions: GameServerDefinition[] = [];
    const stat = fs.lstatSync(sourcePath);
    if (stat.isFile()) {
      const jsonString = fs.readFileSync(sourcePath).toString();
      const serverDefFile = JSON.parse(jsonString) as GameServerDefinitionFile;
      definitions.push(...serverDefFile.definitions);
    } else if (stat.isDirectory()) {
      const files = fs.readdirSync(sourcePath);
      files.forEach((file) => {
        const jsonString = fs.readFileSync(path.join(sourcePath, file)).toString();
        const serverDef = JSON.parse(jsonString) as GameServerDefinition;
        definitions.push(serverDef);
      });
    }

    //
    // create the nested stacks associated with the Game Servers
    //
    this.gameServerStacks = [];
    definitions.forEach((definition) => {
      this.gameServerStacks.push(new GameServerStack(this, definition, network));
    });
  }
}
