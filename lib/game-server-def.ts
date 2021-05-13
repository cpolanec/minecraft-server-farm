/**
 * Structure of a Game Server Definition entry.
 *
 * @interface
 */
export default interface GameServerDefinition {
  name: string;
  initSnapshot: string;
}

/**
 * Structure of a set of Game Server Definition entries (e.g. entries within
 * a single file).
 *
 * @interface
 */
export interface GameServerDefinitionFile {
  definitions: GameServerDefinition[]
}