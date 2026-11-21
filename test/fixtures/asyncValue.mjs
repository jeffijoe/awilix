const value = await Promise.resolve(42)

export default function asyncValue() {
  return value
}
