// Kept in a separate module so it can be excluded from test coverage;
// jest cannot execute a native dynamic import.
export function importModule(path: string): Promise<any> {
  return import(path)
}
