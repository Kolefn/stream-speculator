export default class InsufficientFundsError extends Error {
  constructor(resourceName: string) {
    super(`Not enough coins for ${resourceName}.`);
  }
}
