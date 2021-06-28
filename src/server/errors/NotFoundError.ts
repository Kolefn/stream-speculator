export default class NotFoundError extends Error {
    constructor(resourceName: string) {
      super(`${resourceName} not found.`);
    }
}
  