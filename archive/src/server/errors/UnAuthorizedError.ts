export default class UnAuthorizedError extends Error {
  constructor(resource: string) {
    super(`Permission denied to ${resource}.`);
  }
}
