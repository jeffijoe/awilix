import {
  type AwilixContainer,
  type InferCradleFromContainer,
  type InferCradleFromResolvers,
  type InferResolverType,
  createContainer,
} from '../container'
import {
  type Resolver,
  asValue,
  asFunction,
  asClass,
  aliasTo,
} from '../resolvers'

type IsExact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false

function assertType<T extends true>(_: T): void {
  // compile-time only
}

class UserService {
  name = 'UserService'
}

class Logger {
  log(msg: string) {
    return msg
  }
}

interface AppConfig {
  port: number
  host: string
}

describe('InferResolverType', () => {
  it('extracts type from real resolver definitions', () => {
    const value = asValue('hello')
    const fn = asFunction(() => 42)
    const cls = asClass(Logger)
      .singleton()
      .disposer(() => {})

    assertType<IsExact<InferResolverType<typeof value>, 'hello'>>(true)
    assertType<IsExact<InferResolverType<typeof fn>, number>>(true)
    assertType<IsExact<InferResolverType<typeof cls>, Logger>>(true)
  })

  it('returns never for non-resolver types', () => {
    type Result = InferResolverType<string>
    assertType<IsExact<Result, never>>(true)
  })
})

describe('InferCradleFromContainer', () => {
  it('extracts cradle type from register() chain result', () => {
    const container = createContainer().register({
      userService: asClass(UserService),
      logger: asValue(new Logger()),
      config: asFunction((): AppConfig => ({ port: 3000, host: 'localhost' })),
    })

    type Result = InferCradleFromContainer<typeof container>

    assertType<IsExact<Result['userService'], UserService>>(true)
    assertType<IsExact<Result['logger'], Logger>>(true)
    assertType<IsExact<Result['config'], AppConfig>>(true)
  })

  it('extracts cradle type from scoped container', () => {
    type ParentCradle = { logger: Logger }
    type ScopeCradle = { requestId: string }

    const container = createContainer<ParentCradle>()
    const scope = container.createScope<ScopeCradle>()

    type Result = InferCradleFromContainer<typeof scope>

    assertType<IsExact<Result['logger'], Logger>>(true)
    assertType<IsExact<Result['requestId'], string>>(true)
  })

  it('works with AwilixContainer with default generic (empty object)', () => {
    type Result = InferCradleFromContainer<AwilixContainer>

    assertType<IsExact<Result, {}>>(true)
  })
})

describe('InferCradleFromResolvers', () => {
  it('infers cradle from asValue, asClass, and asFunction resolvers', () => {
    const resolvers = {
      port: asValue(3000),
      userService: asClass(UserService),
      greeting: asFunction(() => 'hello'),
    } satisfies Record<string, Resolver<any>>
    type Result = InferCradleFromResolvers<typeof resolvers>

    assertType<IsExact<Result['port'], 3000>>(true)
    assertType<IsExact<Result['userService'], UserService>>(true)
    assertType<IsExact<Result['greeting'], string>>(true)
  })

  it('preserves type through resolver chaining (lifetime, injection mode, disposer)', () => {
    const resolvers = {
      a: asClass(UserService).singleton().proxy(),
      b: asClass(Logger).scoped().classic(),
      c: asFunction(() => 'test')
        .transient()
        .inject(() => ({}))
        .disposer(() => {}),
    } satisfies Record<string, Resolver<any>>
    type Result = InferCradleFromResolvers<typeof resolvers>

    assertType<IsExact<Result['a'], UserService>>(true)
    assertType<IsExact<Result['b'], Logger>>(true)
    assertType<IsExact<Result['c'], string>>(true)
  })

  it('handles empty resolvers object', () => {
    const resolvers = {}
    type Result = InferCradleFromResolvers<typeof resolvers>

    assertType<IsExact<Result, {}>>(true)
  })

  it('infers cradle from aliasTo with explicit type parameter', () => {
    const resolvers = {
      original: asClass(UserService),
      alias: aliasTo<UserService>('original'),
    }
    type Result = InferCradleFromResolvers<typeof resolvers>

    assertType<IsExact<Result['original'], UserService>>(true)
    assertType<IsExact<Result['alias'], UserService>>(true)
  })
})

describe('register() chaining (type-level)', () => {
  it('returns a container with inferred cradle type', () => {
    const container = createContainer().register({
      userService: asClass(UserService),
      logger: asValue(new Logger()),
    })

    type Cradle = typeof container.cradle
    assertType<IsExact<Cradle['userService'], UserService>>(true)
    assertType<IsExact<Cradle['logger'], Logger>>(true)
  })

  it('resolve() returns correctly typed values', () => {
    const container = createContainer().register({
      port: asValue(3000),
      host: asValue('localhost'),
      config: asValue({ debug: true, retries: 3 }),
    })

    const port = container.resolve('port')
    const host = container.resolve('host')
    const config = container.resolve('config')

    assertType<IsExact<typeof port, 3000>>(true)
    assertType<IsExact<typeof host, 'localhost'>>(true)
    assertType<
      IsExact<typeof config, { readonly debug: true; readonly retries: 3 }>
    >(true)
  })

  it('works with empty resolvers', () => {
    const container = createContainer().register({})

    type Cradle = typeof container.cradle
    assertType<IsExact<Cradle, {}>>(true)
  })

  it('getRegistration returns correctly typed resolver', () => {
    const container = createContainer().register({
      userService: asClass(UserService),
    })

    const reg = container.getRegistration('userService')!
    assertType<IsExact<typeof reg, Resolver<UserService>>>(true)
  })

  it('accumulates types across multiple register() calls', () => {
    const container = createContainer()
      .register({
        userService: asClass(UserService),
      })
      .register({
        logger: asValue(new Logger()),
      })
      .register({
        config: asFunction(
          (): AppConfig => ({ port: 3000, host: 'localhost' }),
        ),
      })

    type Cradle = typeof container.cradle
    assertType<IsExact<Cradle['userService'], UserService>>(true)
    assertType<IsExact<Cradle['logger'], Logger>>(true)
    assertType<IsExact<Cradle['config'], AppConfig>>(true)
  })

  it('register() with name and resolver expands the container type', () => {
    const container = createContainer().register('host', asValue('localhost'))

    assertType<
      IsExact<typeof container, AwilixContainer<{ host: 'localhost' }>>
    >(true)
  })

  it('createScope preserves parent types from register() chain', () => {
    const container = createContainer().register({
      root: asValue('rootValue'),
    })

    interface ScopeCradle {
      scoped: string
    }

    const scope = container.createScope<ScopeCradle>()
    scope.register({
      scoped: asValue('scopedValue'),
    })

    const root = scope.resolve('root')
    assertType<IsExact<typeof root, 'rootValue'>>(true)
    expect(root).toBe('rootValue')

    const scoped = scope.resolve('scoped')
    assertType<IsExact<typeof scoped, string>>(true)
    expect(scoped).toBe('scopedValue')
  })
})
