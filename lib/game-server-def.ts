/**
 * Structure of a Game Server Definition entry.
 *
 * @interface
 */
export default interface GameServerDefinition {
  name: string;
  initSnapshot: string;
  papermc?: {
    version?: string;
    build?: number;
  };
}

export const MC_DEFAULT_VERSION = '1.18.1';

/**
 * Structure of a set of Game Server Definition entries (e.g. entries within
 * a single file).
 *
 * @interface
 */
export interface GameServerDefinitionFile {
  definitions: GameServerDefinition[]
}
