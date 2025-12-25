export class TileMatrixNotFoundError extends Error {
  public constructor(message?: string) {
    const defaultErrorMessage = 'tile matrix with the given id was not found in the given tile matrix collection';
    super(message ?? defaultErrorMessage);
  }
}
