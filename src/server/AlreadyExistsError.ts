export default class AlreadyExistsError extends Error {
  constructor(resourceName: string) {
    super(`${resourceName} already exists.`);
  }
}
