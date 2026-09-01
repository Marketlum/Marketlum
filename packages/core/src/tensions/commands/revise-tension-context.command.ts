export class ReviseTensionContextCommand {
  constructor(
    public readonly id: string,
    public readonly currentContext?: string | null,
    public readonly potentialFuture?: string | null,
  ) {}
}
