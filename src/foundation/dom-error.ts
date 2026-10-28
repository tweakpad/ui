/**
 * The error a rejected API call carries: a `DOMException` with `name` and `message`, or, where
 * `DOMException` cannot be constructed, an `Error` with that `message` whose `name` is `name`.
 */
export function domError(name: string, message: string): Error {
  try {
    return new DOMException(message, name);
  } catch {
    const error = new Error(message);
    error.name = name;
    return error;
  }
}
