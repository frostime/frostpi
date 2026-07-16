export class PiRpcProtocolError extends Error {
  override readonly name = "PiRpcProtocolError";
}

export class PiRpcCommandError extends Error {
  override readonly name = "PiRpcCommandError";

  constructor(
    message: string,
    readonly command: string,
  ) {
    super(message);
  }
}

export class PiRpcProcessError extends Error {
  override readonly name = "PiRpcProcessError";
}
