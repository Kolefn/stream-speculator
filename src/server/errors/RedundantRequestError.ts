export default class RedundantRequestError extends Error {
    constructor(resource: string) {
      super(`Request to ${resource} is redundant.`);
    }
}
  