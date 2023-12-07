/**
 * UnknownEnvironmentError is thrown when the script is
 * is executed without a specific environment.
 */
export class UnknownEnvironmentError extends Error {
  constructor(message: string) {
    super(message);
  }
}
