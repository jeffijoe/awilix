/**
 * The registration will be resolved once and only once.
 * @type {String}
 */
module.exports.SINGLETON = 'SINGLETON'

/**
 * The registration will be resolved every time (never cached).
 * @type {String}
 */
module.exports.TRANSIENT = 'TRANSIENT'

/**
 * The registration will be resolved once per scope.
 * @type {String}
 */
module.exports.SCOPED = 'SCOPED'
