// this is just a dummy..
const messages = {
  1: [{
    message: 'hello'
  }, {
    message: 'world'
  }],

  2: [{
    message: 'damn son'
  }]
}

/**
 * We're using a factory function this time.
 */
module.exports = function makeMessageRepository({ DB_CONNECTION_STRING }) {
  // Imagine using the connection string for something useful..
  console.log('Message repository constructed with connection string', DB_CONNECTION_STRING);

  function findMessagesForUser(userId) {
    return Promise.resolve(messages[userId]);
  }

  return {
    findMessagesForUser
  };
}