module.exports = class MessageService {
  constructor({ currentUser, messageRepository }) {
    console.log('creating message service, user ID: ', currentUser.id);
    this.currentUser = currentUser;
    this.messages = messageRepository;
  }

  findMessages() {
    return this.messages.findMessagesForUser(this.currentUser.id);
  }
};