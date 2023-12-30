const Koa = require('koa')
const KoaRouter = require('koa-router')

// Importing Awilix relatively here, use `awilix` in your
// own setup.
const awilix = require('../..')

// Destructuring to make it nicer.
const { createContainer, asValue, asFunction, asClass } = awilix

// Create a Koa app.
const app = new Koa()
const router = new KoaRouter()

// Create a container.
const container = createContainer({ errorOnShorterLivedDependencies: true })

// Register useful stuff
const MessageService = require('./services/MessageService')
const makeMessageRepository = require('./repositories/messageRepository')
container.register({
  // used by the repository; registered.
  DB_CONNECTION_STRING: asValue('localhost:1234', {
    lifetime: awilix.Lifetime.SINGLETON,
  }),
  // resolved for each request.
  messageService: asClass(MessageService).scoped(),
  // only resolved once
  messageRepository: asFunction(makeMessageRepository).singleton(),
})

// For each request we want a custom scope.
app.use((ctx, next) => {
  console.log('Registering scoped stuff')
  ctx.scope = container.createScope()
  // based on the query string, let's make a user..
  ctx.scope.register({
    // This is where you'd use something like Passport,
    // and retrieve the req.user or something.
    currentUser: asValue({
      id: ctx.request.query.userId,
    }),
  })

  return next()
})

// Register a route..
router.get('/messages', (ctx) => {
  // Use the scope to resolve the message service.
  const messageService = ctx.scope.resolve('messageService')
  return messageService.findMessages().then((messages) => {
    ctx.body = messages
    ctx.status = 200
  })
})

// use the routes.
app.use(router.routes())
app.use(router.allowedMethods())

const PORT = 4321
app.listen(PORT, () => {
  console.log('Awilix Example running on port', PORT)
})
