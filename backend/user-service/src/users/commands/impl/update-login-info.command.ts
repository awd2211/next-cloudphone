export class UpdateLoginInfoCommand {
  constructor(
    public readonly id: string,
    public readonly ip: string
  ) {}
}
