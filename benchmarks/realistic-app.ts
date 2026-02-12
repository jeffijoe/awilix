import { Bench } from 'tinybench'
import { createContainer } from '../src/container'
import { asFunction, asValue } from '../src/resolvers'
import { Lifetime } from '../src/lifetime'
import { formatResults, appendToResults, initResultsFile } from './helpers'

/**
 * Simulates a typical web application DI graph (~50 registrations):
 *
 *   Infrastructure (singletons/values)
 *     -> Repositories (scoped, depend on infra)
 *       -> Services (scoped, depend on repos + other services)
 *         -> Controllers (transient, depend on services)
 *         -> Middleware (transient, depend on services)
 */
function buildAppContainer(strict = false) {
  const container = createContainer({ strict })

  // ── Infrastructure (5 entries) ──────────────────────────────
  container.register({
    config: asValue({ port: 3000, dbUrl: 'postgres://localhost/app' }),
    dbConnection: asFunction(({ config }: any) => ({ query: () => [], config }), {
      lifetime: Lifetime.SINGLETON,
    }),
    logger: asFunction(() => ({ log: () => {}, error: () => {} }), {
      lifetime: Lifetime.SINGLETON,
    }),
    cache: asFunction(({ logger }: any) => ({ get: () => null, set: () => {}, logger }), {
      lifetime: Lifetime.SINGLETON,
    }),
    eventBus: asFunction(({ logger }: any) => ({ emit: () => {}, on: () => {}, logger }), {
      lifetime: Lifetime.SINGLETON,
    }),
  })

  // ── Repositories (10 entries, scoped) ───────────────────────
  container.register({
    userRepo: asFunction(({ dbConnection, logger }: any) => ({
      find: () => [], dbConnection, logger,
    }), { lifetime: Lifetime.SCOPED }),

    orderRepo: asFunction(({ dbConnection, logger }: any) => ({
      find: () => [], dbConnection, logger,
    }), { lifetime: Lifetime.SCOPED }),

    productRepo: asFunction(({ dbConnection, logger }: any) => ({
      find: () => [], dbConnection, logger,
    }), { lifetime: Lifetime.SCOPED }),

    inventoryRepo: asFunction(({ dbConnection, logger }: any) => ({
      find: () => [], dbConnection, logger,
    }), { lifetime: Lifetime.SCOPED }),

    paymentRepo: asFunction(({ dbConnection, logger }: any) => ({
      find: () => [], dbConnection, logger,
    }), { lifetime: Lifetime.SCOPED }),

    notificationRepo: asFunction(({ dbConnection, logger }: any) => ({
      find: () => [], dbConnection, logger,
    }), { lifetime: Lifetime.SCOPED }),

    auditRepo: asFunction(({ dbConnection, logger }: any) => ({
      find: () => [], dbConnection, logger,
    }), { lifetime: Lifetime.SCOPED }),

    sessionRepo: asFunction(({ dbConnection, logger, cache }: any) => ({
      find: () => [], dbConnection, logger, cache,
    }), { lifetime: Lifetime.SCOPED }),

    searchRepo: asFunction(({ dbConnection, logger }: any) => ({
      find: () => [], dbConnection, logger,
    }), { lifetime: Lifetime.SCOPED }),

    analyticsRepo: asFunction(({ dbConnection, logger }: any) => ({
      find: () => [], dbConnection, logger,
    }), { lifetime: Lifetime.SCOPED }),
  })

  // ── Services (15 entries, scoped) ───────────────────────────
  container.register({
    userService: asFunction(({ userRepo, logger, eventBus }: any) => ({
      getUser: () => userRepo.find(), logger, eventBus,
    }), { lifetime: Lifetime.SCOPED }),

    authService: asFunction(({ userRepo, sessionRepo, logger }: any) => ({
      login: () => {}, userRepo, sessionRepo, logger,
    }), { lifetime: Lifetime.SCOPED }),

    productService: asFunction(({ productRepo, logger }: any) => ({
      list: () => productRepo.find(), logger,
    }), { lifetime: Lifetime.SCOPED }),

    inventoryService: asFunction(({ inventoryRepo, logger }: any) => ({
      check: () => inventoryRepo.find(), logger,
    }), { lifetime: Lifetime.SCOPED }),

    paymentService: asFunction(({ paymentRepo, logger }: any) => ({
      charge: () => {}, paymentRepo, logger,
    }), { lifetime: Lifetime.SCOPED }),

    notificationService: asFunction(({ notificationRepo, logger, eventBus }: any) => ({
      send: () => {}, notificationRepo, logger, eventBus,
    }), { lifetime: Lifetime.SCOPED }),

    searchService: asFunction(({ searchRepo, productRepo, logger, cache }: any) => ({
      search: () => searchRepo.find(), productRepo, logger, cache,
    }), { lifetime: Lifetime.SCOPED }),

    analyticsService: asFunction(({ analyticsRepo, logger }: any) => ({
      track: () => {}, analyticsRepo, logger,
    }), { lifetime: Lifetime.SCOPED }),

    auditService: asFunction(({ auditRepo, logger }: any) => ({
      log: () => {}, auditRepo, logger,
    }), { lifetime: Lifetime.SCOPED }),

    sessionService: asFunction(({ sessionRepo, logger, cache }: any) => ({
      get: () => sessionRepo.find(), logger, cache,
    }), { lifetime: Lifetime.SCOPED }),

    cartService: asFunction(({ productService, inventoryService, logger }: any) => ({
      add: () => {}, productService, inventoryService, logger,
    }), { lifetime: Lifetime.SCOPED }),

    orderService: asFunction(({ orderRepo, productRepo, inventoryRepo, paymentService, logger, eventBus }: any) => ({
      place: () => {}, orderRepo, productRepo, inventoryRepo, paymentService, logger, eventBus,
    }), { lifetime: Lifetime.SCOPED }),

    checkoutService: asFunction(({ cartService, orderService, paymentService, logger }: any) => ({
      checkout: () => {}, cartService, orderService, paymentService, logger,
    }), { lifetime: Lifetime.SCOPED }),

    emailService: asFunction(({ notificationService, logger }: any) => ({
      sendEmail: () => {}, notificationService, logger,
    }), { lifetime: Lifetime.SCOPED }),

    reportService: asFunction(({ analyticsService, orderService, logger }: any) => ({
      generate: () => {}, analyticsService, orderService, logger,
    }), { lifetime: Lifetime.SCOPED }),
  })

  // ── Controllers (10 entries, transient) ─────────────────────
  container.register({
    userController: asFunction(({ userService, authService, logger }: any) => ({
      handle: () => userService.getUser(), authService, logger,
    })),

    orderController: asFunction(({ orderService, cartService, checkoutService, logger }: any) => ({
      handle: () => orderService.place(), cartService, checkoutService, logger,
    })),

    productController: asFunction(({ productService, searchService, logger }: any) => ({
      handle: () => productService.list(), searchService, logger,
    })),

    paymentController: asFunction(({ paymentService, orderService, logger }: any) => ({
      handle: () => paymentService.charge(), orderService, logger,
    })),

    notificationController: asFunction(({ notificationService, emailService, logger }: any) => ({
      handle: () => notificationService.send(), emailService, logger,
    })),

    analyticsController: asFunction(({ analyticsService, reportService, logger }: any) => ({
      handle: () => analyticsService.track(), reportService, logger,
    })),

    authController: asFunction(({ authService, sessionService, logger }: any) => ({
      handle: () => authService.login(), sessionService, logger,
    })),

    searchController: asFunction(({ searchService, logger }: any) => ({
      handle: () => searchService.search(), logger,
    })),

    inventoryController: asFunction(({ inventoryService, productService, logger }: any) => ({
      handle: () => inventoryService.check(), productService, logger,
    })),

    adminController: asFunction(({ userService, auditService, analyticsService, logger }: any) => ({
      handle: () => {}, userService, auditService, analyticsService, logger,
    })),
  })

  // ── Middleware (5 entries) ───────────────────────────────────
  container.register({
    authMiddleware: asFunction(({ authService, logger }: any) => ({
      run: () => authService.login(), logger,
    })),

    rateLimiter: asFunction(({ cache, logger }: any) => ({
      check: () => cache.get(), logger,
    }), { lifetime: Lifetime.SINGLETON }),

    requestLogger: asFunction(({ logger, auditService }: any) => ({
      run: () => auditService.log(), logger,
    })),

    errorHandler: asFunction(({ logger, notificationService }: any) => ({
      run: () => logger.error(), notificationService,
    })),

    corsMiddleware: asValue({ origin: '*' }),
  })

  return container
}

// ─── Benchmarks ───────────────────────────────────────────────
//
// Each test simulates a real-world usage pattern of a DI container in a
// web application. A fresh scope per iteration models a per-request scope
// (the standard pattern in Express/Koa/Fastify integrations).

const bench = new Bench({ warmupIterations: 50, iterations: 500 })

// Resolves a controller with the deepest dependency graph in the app:
// orderController -> orderService -> orderRepo -> dbConnection (singleton)
//                 -> cartService -> productService -> productRepo -> ...
//                 -> checkoutService -> paymentService -> ...
// This exercises the full resolve path: scope creation, transient factory
// invocation, scoped cache population (repos/services resolved for the
// first time in a fresh scope), and singleton cache hits (infra layer).
const app1 = buildAppContainer()
bench.add('resolve orderController (deep graph, fresh scope)', () => {
  const scope = app1.createScope()
  scope.resolve('orderController')
})

// Resolves 3 controllers in the same scope. The second and third controllers
// share scoped dependencies (repos, services) that were already resolved by
// the first. Measures how well scoped caching amortizes repeated lookups
// within a single request scope.
const app2 = buildAppContainer()
bench.add('resolve 3 controllers in same scope', () => {
  const scope = app2.createScope()
  scope.resolve('orderController')
  scope.resolve('userController')
  scope.resolve('analyticsController')
})

// Simulates a complete HTTP request lifecycle: resolve middleware (auth +
// request logging), resolve a controller, then dispose the scope (cleanup).
// The dispose() call is async and iterates over cached entries, so this
// measures the full create-resolve-teardown cycle including cleanup cost.
const app3 = buildAppContainer()
bench.add('full request: middleware + controller + dispose', async () => {
  const scope = app3.createScope()
  scope.resolve('authMiddleware')
  scope.resolve('requestLogger')
  scope.resolve('orderController')
  await scope.dispose()
})

// Resolves the same scoped service twice in one scope. The first call
// invokes the factory and populates the scoped cache. The second call
// should return the cached value immediately. Measures the cache-hit
// fast path vs. the cold-start factory path within a single scope.
const app4 = buildAppContainer()
bench.add('scoped service: first resolve + cache hit', () => {
  const scope = app4.createScope()
  scope.resolve('checkoutService') // cold — factory runs
  scope.resolve('checkoutService') // hot — cache hit
})

// Resolves a singleton (dbConnection) from a 2-level nested scope.
// The singleton is registered and cached on the root container, so the
// child scope must look up through the parent chain to find it. After
// the first call, the singleton is cached on the root — subsequent calls
// test how fast a cached singleton is returned from a nested scope.
const app5 = buildAppContainer()
const testScope = app5.createScope()
bench.add('resolve singleton from nested scope', () => {
  const requestScope = testScope.createScope()
  requestScope.resolve('dbConnection')
})

// Resolves a service with a shallow dependency graph (productService
// depends only on productRepo + logger). Contrasts with the deep
// orderController graph to isolate the cost of graph depth vs.
// per-resolve overhead.
const app6 = buildAppContainer()
bench.add('resolve productService (shallow, fresh scope)', () => {
  const scope = app6.createScope()
  scope.resolve('productService')
})

// Calls hasRegistration() 5 times with a mix of existing and
// non-existent names. hasRegistration() calls getRegistration()
// internally, which walks the parent scope chain for non-local
// registrations. Non-existent names must walk the entire chain
// before returning null. Measures the lookup-only cost without
// any factory invocation.
const app7 = buildAppContainer()
const checkScope = app7.createScope()
bench.add('hasRegistration x5 (mixed hits and misses)', () => {
  checkScope.hasRegistration('orderController')
  checkScope.hasRegistration('nonExistent')
  checkScope.hasRegistration('dbConnection')
  checkScope.hasRegistration('alsoMissing')
  checkScope.hasRegistration('userService')
})

// The lightest real operation: create a scope and resolve a plain value
// (config is registered via asValue — no factory, no dependencies).
// Measures the fixed overhead of scope creation + resolve() entry/exit
// with minimal actual work.
const app8 = buildAppContainer()
bench.add('create scope + resolve config value', () => {
  const scope = app8.createScope()
  scope.resolve('config')
})

// Same deep graph as the first benchmark, but with strict mode enabled.
// Strict mode adds a lifetime leak check at every resolve() call that
// scans the resolution stack for ancestors with longer lifetimes.
// Measures the marginal cost of strict mode on a realistic graph.
const appStrict = buildAppContainer(true)
bench.add('resolve orderController (strict mode, fresh scope)', () => {
  const scope = appStrict.createScope()
  scope.resolve('orderController')
})

// Resolves all 10 controllers in a single fresh scope. This is the
// heaviest workload — it touches every registration in the container.
// Scoped dependencies are resolved on the first controller that needs
// them and cached for subsequent controllers. Measures aggregate
// throughput for a full dependency graph traversal.
const app10 = buildAppContainer()
const controllers = [
  'userController', 'orderController', 'productController',
  'paymentController', 'notificationController', 'analyticsController',
  'authController', 'searchController', 'inventoryController', 'adminController',
]
bench.add('resolve all 10 controllers (fresh scope)', () => {
  const scope = app10.createScope()
  for (const c of controllers) scope.resolve(c)
})

if (!process.env.BENCH_RESULTS_FILE) {
  initResultsFile()
}

bench.run().then(() => {
  const { rows, markdown } = formatResults(bench)
  console.log('\n=== Realistic App Benchmark (50 registrations) ===')
  console.table(rows)
  appendToResults('Realistic App (50 registrations)', markdown)
})
