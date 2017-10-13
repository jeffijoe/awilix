/**
 * Catches an error when running the given fn, and returns it.
 *
 * @param  {Function} fn
 * @return {Error}
 */
module.exports.catchError = fn => {
  try {
    fn()
    throw new Error('Expected to catch an error, but did not.')
  } catch (err) {
    return err
  }
}
