/** Internal adapter outcome, never a public service error or SDK retry signal. */
export class PlanetAtomicCreateConflict extends Error {
  constructor(cause:Error){
    super('Atomic authority create conflict.',{cause});
    this.name='PlanetAtomicCreateConflict';
  }
}
