/**
 * Abstract base class for actions. It serves as a foundation for all specific action types and is not
 * intended for direct instantiation.
 */
export class Action {
  /**
   * Constructs an Action instance. Blocks direct instantiation of this abstract class.
   * @throws {TypeError} If directly instantiated.
   */
  constructor() {
    if (new.target === Action) {
      throw new TypeError('Cannot instantiate abstract class Action directly')
    }
  }
}
