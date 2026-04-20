================================================================================
                        SNIP — URL SHORTENER
                   Complete Project Documentation
================================================================================

PROJECT OVERVIEW
----------------
Snip is a full-stack URL shortener with real-time click analytics, Redis caching,
background job processing, rate limiting, and event-driven click tracking via Kafka.
Users paste a long URL, receive a short URL + QR code instantly, can optionally set
a custom alias, expiry date, password protection, max-clicks limit, and webhook URL.
Authenticated users get a personal dashboard and a programmatic API key.

Repository layout:
  /Backend    — NestJS REST API
  /Frontend   — Next.js web application

FEATURE SET
-----------
  1. URL Shortening          — nanoid(6) codes or custom aliases (4–10 chars)
  2. QR Code Generation      — Indigo-on-dark QR rendered to data URI at creation time
  3. Password-Protected URLs — bcrypt-hashed password; unlock page gates redirect
  4. Max-Clicks (self-destruct) — link goes 410 Gone after N clicks
  5. Expiry Dates            — ISO 8601 TTL; smart cache respects expiry
  6. User Authentication     — JWT register/login + optional auth on URL creation
  7. API Key Authentication  — Permanent `snip_*` keys for programmatic access
  8. Google Safe Browsing    — Real-time malware/phishing detection on all links
  9. Webhook Integration     — POST click payload to user-defined URL on every click
 10. Kafka Click Pipeline    — Event-driven click tracking with Dead Letter Queue
 11. GeoIP Enrichment        — ip-api.com lookup: country + city per click
 12. UA Parsing              — ua-parser-js: device type, browser, OS per click
 13. ClickEvent Records      — per-click DB rows with all enrichment fields
 14. Analytics Breakdowns    — top-10 browsers, devices, countries from ClickEvents
 15. Redis Distributed Lock  — setNx prevents race conditions on alias creation
 16. Idempotency Support     — Idempotency-Key header deduplicates URL creation
 17. Bulk Shortening         — frontend page shortens up to 20 URLs at once
 18. Observability Stack     — Prometheus metrics + Grafana visualization


================================================================================
TECH STACK
================================================================================

BACKEND
-------
  Runtime         Node.js v23 (ESM + CommonJS mixed)
  Language        TypeScript 5.7
  Framework       NestJS 11         — modular, decorator-driven Node.js framework
  ORM             Prisma 6          — type-safe database client + migrations
  Database        PostgreSQL         — primary relational data store
  Cache           Redis (ioredis 5) — URL cache + click counters + idempotency store
  Message Broker  Kafka (KRaft)     — event streaming for async click tracking + DLQ
  Job Queue       BullMQ 5          — kept for reference (replaced by Kafka in flow)
  Validation      class-validator + class-transformer
  Rate Limiting   rate-limiter-flexible (RateLimiterRedis)
  ID Generation   nanoid 5          — cryptographically random short codes
  Config          @nestjs/config + Joi — typed env vars with validation at boot
  API Docs        @nestjs/swagger + swagger-ui-express — OpenAPI 3.0
  Auth            @nestjs/jwt + @nestjs/passport + passport-jwt
  Password        bcryptjs          — URL passwords + user account passwords
  QR Codes        qrcode            — data URI generation
  UA Parsing      ua-parser-js      — device/browser/OS detection in Kafka consumer
  GeoIP           ip-api.com (HTTP) — country/city lookup per click

FRONTEND
--------
  Framework       Next.js 16 (App Router)
  Language        TypeScript 5
  UI Library      React 19
  Styling         Tailwind CSS 4    — utility-first CSS with custom design tokens
  Font            Inter (Google Fonts, loaded via next/font — no layout shift)
  HTTP Client     Fetch API (native)
  Icons           lucide-react
  Bundler         Next.js built-in (Turbopack in dev)


================================================================================
BACKEND — ARCHITECTURE
================================================================================

ENTRY POINT: src/main.ts
--------------------------
The bootstrap function:
  1. Creates the NestJS application
  2. Enables graceful shutdown hooks (SIGTERM drains in-flight requests)
  3. Configures CORS — origin is read from FRONTEND_URL env var (not wildcard)
  4. Applies global ValidationPipe — strips unknown fields, rejects bad input
  5. Mounts Swagger UI at /api/docs
  6. Connects and starts the Kafka microservice consumer (click-events topic)
  7. Starts HTTP server on PORT env var (default 3000)
  8. Imports batch.processor.ts as a side-effect so the Redis→DB flush job
     runs in the same process (suitable for single-dyno deploys)

MODULE TREE
-----------
  AppModule
  ├── ConfigModule (global)     — env var loading + Joi schema validation
  ├── RedisModule (global)      — single shared ioredis client (REDIS_CLIENT token)
  ├── KafkaModule               — Kafka producer + consumer for click events
  ├── GeoModule                 — ip-api.com lookup service
  ├── UrlModule
  │   └── AnalyticsModule
  ├── RedirectModule
  │   └── (imports KafkaModule for KafkaProducerService)
  ├── AnalyticsModule
  ├── HealthModule
  ├── AuthModule                — JWT register/login + API key issuance
  └── PrometheusModule          — Export metrics to /api/metrics

DATABASE SCHEMA (prisma/schema.prisma)
---------------------------------------
  model User {
    id          String    @id @default(cuid())
    email       String    @unique
    password    String                          — bcrypt-hashed
    apiKey      String?   @unique               — snip_* prefix, plain (not hashed)
    createdAt   DateTime  @default(now())
    updatedAt   DateTime  @updatedAt
    urls        Url[]
  }

  model Url {
    id          String       @id @default(cuid())
    shortCode   String       @unique
    originalUrl String
    expiresAt   DateTime?                       — optional TTL
    clicks      Int          @default(0)        — flushed click counter
    maxClicks   Int?                            — self-destruct threshold
    password    String?                         — bcrypt-hashed, nullable
    qrCode      String?                         — data URI (generated at creation)
    webhookUrl  String?                         — POSTed on each click
    userId      String?                         — nullable FK to User
    user        User?        @relation(...)     — onDelete: SetNull
    clickEvents ClickEvent[]
    createdAt   DateTime     @default(now())
    updatedAt   DateTime     @updatedAt

    @@index([userId])
  }

  model ClickEvent {
    id        String   @id @default(cuid())
    urlId     String
    url       Url      @relation(...)           — onDelete: Cascade
    country   String?                           — from GeoService
    city      String?
    device    String?                           — from ua-parser-js (desktop/mobile/tablet)
    browser   String?
    os        String?
    createdAt DateTime @default(now())

    @@index([urlId])
  }


================================================================================
BACKEND — MODULES IN DETAIL
================================================================================

── AUTH MODULE ─────────────────────────────────────────────────────────────────

  AuthController
    POST /auth/register      — creates user, returns JWT + user info
    POST /auth/login         — validates credentials, returns JWT + apiKey if set
    GET  /auth/api-key       — (JwtAuthGuard) returns current API key
    POST /auth/api-key/generate — (JwtAuthGuard) generates/replaces API key

  AuthService
    register(dto)  — checks email uniqueness, hashes password with bcrypt(10),
                     creates User, signs JWT with { sub: id, email }
    login(dto)     — finds user, bcrypt.compare, signs JWT, returns user + apiKey
    generateApiKey — produces "snip_" + 32 alphanumeric chars (bcrypt hash of
                     timestamp+userId, stripped of non-alphanumeric), saves to DB
    getApiKey      — returns { apiKey } for the user

  Guards
    JwtAuthGuard          — standard passport-jwt guard; throws 401 if missing/invalid
    OptionalJwtAuthGuard  — extends JwtAuthGuard; does NOT throw on missing token
                            (attaches user if valid, leaves req.user undefined if not)
    ApiKeyGuard           — reads x-api-key header; if present, looks up user by
                            apiKey and attaches to req.user; if absent, passes through

  JWT Strategy (passport-jwt)
    Reads JWT_SECRET from config; extracts Bearer token from Authorization header.
    Payload: { sub: userId, email }

── URL MODULE ──────────────────────────────────────────────────────────────────

  UrlController   POST   /url              — create (optional auth via JWT or API key)
                  GET    /url/my-links     — (JwtAuthGuard) list URLs owned by user
                  DELETE /url/:code        — (JwtAuthGuard) delete owned URL
                  POST   /url/:code/unlock — verify password for protected URL
                  GET    /url/:code/stats  — delegates to AnalyticsService

  UrlService.createShortUrl(dto, idempotencyKey?)
    Inputs: originalUrl, customAlias?, expiresAt?, maxClicks?, password?,
            webhookUrl?, userId?

    Idempotency check (if Idempotency-Key header present):
      Reads Redis key "idemp:{key}". Returns cached JSON immediately on hit.

    1. Validates expiresAt is in the future (throws 400 if not)
    2. Calls checkSpam(url) — Google Safe Browsing API (skipped if no API key)
    3. Hashes password with bcrypt(10) if provided
    4. Loop up to MAX_RETRIES=5:
         a. Generates shortCode: customAlias or nanoid(6)
         b. Generates QR code data URI (qrcode.toDataURL, indigo+dark theme)
         c. Acquires Redis distributed lock: setNx("url-lock:{code}", "LOCK", 5s TTL)
            — If lock fails on custom alias → throws 400 immediately
            — If lock fails on nanoid → warns and retries
         d. prisma.url.create({ shortCode, originalUrl, expiresAt, maxClicks,
                                  password (hashed), qrCode, userId, webhookUrl })
            — P2002 on custom alias → throws 400 "Alias already taken"
            — P2002 on nanoid → retries with new code
         e. On success: logs, builds result { shortCode, shortUrl, qrCode,
                         hasPassword, maxClicks }
         f. If idempotencyKey present: caches result in Redis for 24h
         g. Releases lock (finally block)
    5. After 5 failures → throws 500

  UrlService.verifyPassword(code, password)
    Finds URL. If no password field → returns { valid: true, originalUrl }.
    bcrypt.compare(input, hash) → returns { valid, originalUrl? }.

  UrlService.getUrlsByUser(userId)
    prisma.url.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })

  UrlService.deleteUrl(code, userId)
    Checks ownership (url.userId === userId), throws 400 if not. Deletes URL.

  Google Safe Browsing (UrlService.checkSpam)
    POSTs to safebrowsing.googleapis.com/v4/threatMatches:find
    Checks: MALWARE, SOCIAL_ENGINEERING, UNWANTED_SOFTWARE, POTENTIALLY_HARMFUL_APPLICATION
    If matches → throws 400 "Malicious or spam URL detected. Request blocked."
    If API key missing or API errors → skips silently (never blocks creation)

  CreateUrlDto (validated by class-validator):
    originalUrl  — @IsUrl({ protocols: ['http','https'], require_protocol, require_tld })
    customAlias  — @IsOptional @IsString @Length(4, 10)
    expiresAt    — @IsOptional @IsDateString
    maxClicks    — @IsOptional @IsInt @Min(1) @Max(1_000_000)
    password     — @IsOptional @IsString @Length(4, 100)
    webhookUrl   — @IsOptional @IsUrl({ protocols: ['http','https'] })

── REDIRECT MODULE ─────────────────────────────────────────────────────────────

  RedirectController  GET /:code
    1. Checks RESERVED_PATHS set {'health','metrics','url','auth','api'} → 404
    2. Rate-limits by IP via RateLimiterService
    3. Calls RedirectService.getOriginalUrl(code)
    4. If result.requiresPassword → returns 200 JSON { requiresPassword: true, shortCode }
       (Frontend intercepts and redirects to /:code/unlock page)
    5. Extracts real IP from x-forwarded-for header (first entry)
    6. Publishes click event to Kafka (fire and forget): publishClickEvent(code, ip, userAgent)
    7. Returns HTTP 302 redirect to original URL

  RedirectService.getOriginalUrl(code) → RedirectResult
    1. Queries PostgreSQL for the URL record (always — needed for all checks)
    2. If not found → throws 404
    3. If expiresAt < now → throws 410 Gone
    4. If url.password is set → returns { requiresPassword: true } immediately
    5. Max-clicks check: reads Redis counter "clicks:{code}", adds to url.clicks.
       If total >= url.maxClicks → throws 410 "max click limit reached"
    6. Checks Redis cache (key = shortCode)
       — Cache hit: returns { requiresPassword: false, originalUrl }
    7. Calculates smart TTL: min(3600, secondsUntilExpiry)
    8. Caches url.originalUrl in Redis with smart TTL
    9. Returns { requiresPassword: false, originalUrl }

── ANALYTICS MODULE ────────────────────────────────────────────────────────────

  AnalyticsService.getStats(code)
    1. Queries PostgreSQL for URL record including last 500 ClickEvents (desc)
    2. Throws 404 if URL not found
    3. Reads Redis counter "clicks:{code}" for pending (un-flushed) clicks
    4. Aggregates ClickEvent records into:
         browserCounts, deviceCounts, countryCounts (Record<string, number>)
    5. Converts to top-10 sorted lists: [{ label, count }]
    6. Returns:
         { shortCode, originalUrl, totalClicks (db + pending), dbClicks,
           pendingClicks, createdAt, expiresAt, maxClicks, hasPassword,
           qrCode, browsers, devices, countries }

── GEO MODULE ──────────────────────────────────────────────────────────────────

  GeoService.lookup(ip) → { country: string|null, city: string|null }
    Skips loopback / private IPs (::1, 127.0.0.1, 192.168.*, 10.*).
    Fetches http://ip-api.com/json/{ip}?fields=status,country,city with 2s timeout.
    Returns { country, city } on success; { null, null } on any failure.
    Never throws — failures are logged as warnings.

── REDIS MODULE (SHARED CONNECTION) ────────────────────────────────────────────

  RedisModule (@Global)
    Provides a single REDIS_CLIENT (Symbol injection token) using a factory:
      new Redis(REDIS_URL) — one shared connection for NestJS services
    Exports: REDIS_CLIENT token + RedisService

  RedisService — thin wrapper around ioredis:
    get(key)                  — GET
    set(key, value, ttl=3600) — SET EX
    del(key)                  — DEL
    incr(key)                 — INCR
    setNx(key, value, ttlSec) — SET NX EX (returns boolean — used for distributed lock)

  RateLimiterService
    Injects REDIS_CLIENT and passes it to RateLimiterRedis.
    Config: 10 requests per 60 seconds per IP. Throws 429 on breach.

── KAFKA MODULE ────────────────────────────────────────────────────────────────

  KafkaProducerService (src/kafka/kafka.producer.service.ts)
    publishClickEvent(code, ip, userAgent): emits { code, ip, userAgent } to
      the "click-events" Kafka topic. Fire-and-forget — never blocks redirect.
    publishToDLQ(payload, errorMessage): emits failed events to "click-events-dlq"
      topic for inspection and replay.

  KafkaConsumerService (src/kafka/kafka.consumer.service.ts)
    @EventPattern('click-events') handleClickEvent(message):
      1. Increments Redis counter: redis.incr("clicks:{code}")
      2. Parses userAgent with ua-parser-js → device type, browser name, OS name
      3. Looks up IP via GeoService → { country, city }
      4. Finds URL record by shortCode (prisma.url.findUnique)
      5. Creates ClickEvent row with all enrichment fields
      6. If url.webhookUrl set → triggerWebhook() (async, non-blocking)
      On any error → calls kafkaProducer.publishToDLQ(payload, err.message)

    triggerWebhook(url, payload):
      POST to webhookUrl with JSON: { code, ip, device, browser, os,
                                       country, city, timestamp }
      Logs warning on non-OK response. Never throws.

── QUEUE SYSTEM ────────────────────────────────────────────────────────────────

  Click tracking is intentionally async — never blocks a redirect.

  Flow:
    GET /:code
    └─ RedirectController → kafkaProducer.publishClickEvent(code, ip, ua)
       └─ KafkaConsumerService.handleClickEvent()
          ├─ redis.incr("clicks:{code}")
          ├─ UA parse + GeoIP lookup
          ├─ prisma.clickEvent.create()
          └─ triggerWebhook() if configured
              [on error] → DLQ (click-events-dlq topic)

  Batch Processor (src/queue/batch.processor.ts)
    Runs on a setInterval every 10 seconds.
    1. SCAN Redis for all keys matching "clicks:*" (cursor loop, COUNT 100)
    2. For each key: reads counter, prisma.url.updateMany({ clicks: { increment } })
    3. Deletes Redis key ONLY after successful DB write
    4. Logs count of processed keys

  BullMQ (src/queue/queue.service.ts + worker.ts)
    Kept in codebase for reference. No longer active in the redirect flow.

── HEALTH & OBSERVABILITY ──────────────────────────────────────────────────────

  GET /health    → { status: 'ok', timestamp: ISO8601 }
  GET /api/docs  → Full Swagger UI (OpenAPI 3.0)
  GET /api/metrics → Prometheus metrics endpoint

── ENVIRONMENT VALIDATION ──────────────────────────────────────────────────────

  src/config/env.validation.ts — Joi schema:
    DATABASE_URL              required string
    REDIS_URL                 default: redis://localhost:6379
    KAFKA_BROKERS             default: kafka:9092
    PORT                      number, default: 3000
    BASE_URL                  default: http://localhost:3000
    FRONTEND_URL              default: http://localhost:3001
    NODE_ENV                  enum: development | production | test

  Additional env vars (used but not in Joi schema — optional):
    JWT_SECRET                — Required for auth; defaults to NestJS jwt default if absent
    GOOGLE_SAFE_BROWSING_API_KEY — Optional; spam check skipped if absent


================================================================================
BACKEND — OPTIMIZATIONS
================================================================================

1. REDIS CACHE FOR REDIRECTS
   Every non-password-protected redirect checks Redis before PostgreSQL.
   Result: hot URLs serve from memory — no DB query. Latency <1ms vs. 5–20ms.

2. SMART CACHE TTL FOR EXPIRING URLS
   TTL is min(3600, secondsUntilExpiry). A URL expiring in 45 seconds is cached
   for 45 seconds — never serves stale expired URLs.

3. REDIS SCAN INSTEAD OF KEYS (batch processor)
   redis.scan() with cursor pagination (COUNT 100) vs. blocking redis.keys() O(N).

4. WRITE BATCHING (batch processor)
   Redis INCR on hot path; batch flushes counters to PostgreSQL every 10s.
   1000 clicks across 10 URLs = 10 DB writes per interval instead of 1000.

5. ASYNC CLICK TRACKING (Kafka)
   Redirect responds before click is counted. Kafka persists the event to disk.
   Consumer enriches (geo + UA), writes ClickEvent, fires webhook — all async.

6. RACE-CONDITION-FREE URL CREATION
   Redis distributed lock (setNx with 5s TTL) acquired before prisma.url.create.
   DB unique index on shortCode is the final backstop. Catches P2002 for retry.

7. NANOID COLLISION RETRY (up to 5 attempts)
   64^6 ≈ 68.7 billion codes. Collision retries handle the vanishing edge case.

8. IDEMPOTENCY (24-hour Redis cache)
   Idempotency-Key header prevents duplicate URL creation on retried requests.
   Result is stored as JSON at "idemp:{key}" for 86400 seconds.

9. SHARED REDIS CONNECTION (NestJS DI)
   One ioredis client shared via REDIS_CLIENT token. Fewer TCP connections.

10. RATE LIMITING (Redis sliding window)
    10 req / 60s per IP. State in Redis — survives restarts and load balancers.

11. VALIDATION PIPE (global)
    whitelist + forbidNonWhitelisted — strips / rejects unknown fields.

12. GRACEFUL SHUTDOWN
    app.enableShutdownHooks() — PrismaService disconnects cleanly on SIGTERM.

13. QR CODE AT CREATION TIME
    QR is generated once and stored in the DB (data URI). No on-the-fly rendering.


================================================================================
BACKEND — API REFERENCE
================================================================================

Auth
  POST /auth/register          — { email, password } → { access_token, user }
  POST /auth/login             — { email, password } → { access_token, user, apiKey? }
  GET  /auth/api-key           — [Bearer] → { apiKey }
  POST /auth/api-key/generate  — [Bearer] → { apiKey }

URLs
  POST   /url                  — [optional Bearer/x-api-key] create short URL
                                  Body: { originalUrl, customAlias?, expiresAt?,
                                          maxClicks?, password?, webhookUrl? }
                                  Header: Idempotency-Key (optional)
                                  → { shortCode, shortUrl, qrCode, hasPassword, maxClicks }
  GET    /url/my-links         — [Bearer] → Url[] (user's URLs)
  DELETE /url/:code            — [Bearer] → { success: true }
  POST   /url/:code/unlock     — { password } → { valid, originalUrl? }
  GET    /url/:code/stats      — → full analytics response (see AnalyticsService)

Redirect
  GET    /:code                — 302 redirect or { requiresPassword: true, shortCode }

Health
  GET    /health               — { status: 'ok', timestamp }
  GET    /api/metrics          — Prometheus text metrics


================================================================================
BACKEND — TESTING
================================================================================

Framework: Jest + @nestjs/testing

Test files:
  src/modules/url/url.service.spec.ts           — UrlService unit tests
  src/modules/url/url.controller.spec.ts        — UrlController unit tests
  src/modules/redirect/redirect.service.spec.ts — RedirectService unit tests
  src/modules/redirect/redirect.controller.spec.ts — RedirectController unit tests
  src/modules/analytics/analytics.service.spec.ts  — AnalyticsService unit tests

UrlService tests cover:
  ✓ creates a short URL successfully
  ✓ uses custom alias when provided
  ✓ throws 400 when custom alias is already taken (P2002)
  ✓ retries on random code collision before succeeding
  ✓ throws 500 after 5 failed collision retries
  ✓ throws 400 for past expiresAt date
  ✓ stores expiresAt as Date object in Prisma data
  ✓ propagates unexpected DB errors unchanged

RedirectService tests cover:
  ✓ returns cached URL on cache hit without querying PostgreSQL
  ✓ fetches from DB on cache miss and caches the result
  ✓ caches with reduced TTL when URL has a future expiry date
  ✓ throws 404 when URL does not exist in DB
  ✓ throws 410 Gone for expired URL, does not cache

AnalyticsService tests cover:
  ✓ returns totalClicks = dbClicks + pendingClicks
  ✓ handles null Redis clicks gracefully
  ✓ reads Redis key with correct "clicks:{code}" format
  ✓ throws 404 when URL does not exist

Running tests:
  npx jest --no-coverage


================================================================================
FRONTEND — ARCHITECTURE
================================================================================

Framework: Next.js 16 App Router
All pages under src/app/

PAGES
-----

  src/app/page.tsx  (route: /)
    Home — URL shortener form. State: url, customAlias, expiresAt, maxClicks,
    password, webhookUrl (advanced options panel, collapsed by default), result,
    error, loading, copied. On submit calls createShortUrl() from lib/api.ts.
    Shows short URL, QR code, copy button, analytics link on success.
    Displays recent links via RecentLinks component.

  src/app/[code]/route.ts  (route: /:code — frontend redirect)
    Next.js route handler that calls the backend. If the backend returns
    { requiresPassword: true }, redirects to /:code/unlock.
    Otherwise issues a 302 redirect to the originalUrl.

  src/app/[code]/unlock/page.tsx  (route: /:code/unlock)
    Password gate for protected URLs. User enters password → calls
    verifyPassword(code, password) → if valid, navigates to originalUrl.
    Shows error on wrong password.

  src/app/[code]/stats/page.tsx  (route: /:code/stats)
    Analytics page. Fetches getStats(code). Displays:
      — Stat cards: Total Clicks, Synced to DB, Pending in Redis
      — QR code image
      — Details: Original URL, Short Code, Created, Expires, Max Clicks
      — Top browsers, devices, countries bar charts/lists
      — Loading spinner and error state

  src/app/dashboard/page.tsx  (route: /dashboard)
    Authenticated users only (redirects to /login if no user).
    Lists all user's URLs with click counts. Actions: visit, view stats, delete.
    API key management section: display, copy, generate/regenerate.

  src/app/bulk/page.tsx  (route: /bulk)
    Bulk shortener. Textarea accepts up to 20 URLs (one per line, http* only).
    Processes sequentially, shows results with success/error per URL.
    "Copy all" button copies all short URLs in "input → shortUrl" format.

  src/app/login/page.tsx  (route: /login)
    Login form. Calls login() from api.ts. On success stores JWT in AuthProvider,
    redirects to dashboard.

  src/app/register/page.tsx  (route: /register)
    Register form. Calls register() from api.ts. On success auto-logs-in and
    redirects to dashboard.

  src/app/guide/page.tsx  (route: /guide)
    Product guide page — feature overview with cards for basic shortening,
    QR codes, password protection, analytics, API access, webhooks.

  src/app/layout.tsx  (root layout)
    Loads Inter font via next/font/google. Sets <html lang="en" className="dark">.
    Wraps children in AuthProvider + ToastProvider.
    Renders Header component (nav links + auth state + theme toggle).
    Ambient background glow divs (CSS blur circles, z-index: -10).

COMPONENTS
----------

  src/components/AuthProvider.tsx
    React context provider. Reads JWT from localStorage on mount. Exposes
    { user, token, login(token, user), logout() }. JWT is stored under
    "snip_token" in localStorage.

  src/components/Header.tsx
    Persistent nav bar. Shows logo, links (Home, Bulk, Guide, Dashboard).
    Hides Dashboard link when already on /dashboard.
    Auth state: Login/Register buttons or user email + Logout button.
    Includes ThemeToggle.

  src/components/ThemeToggle.tsx
    Toggles data-theme attribute on <html> between "dark" and "light".
    Persists preference to localStorage.

  src/components/RecentLinks.tsx
    Reads up to 5 recent links from localStorage ("snip_recent").
    Exposes saveRecentLink() helper used by home + bulk pages.
    Listens for "snip-recent-updated" window event to refresh list.

  src/components/Toast.tsx
    Global toast notification system. useToast() hook exposes toast(message,
    type, duration) and dismiss(). ToastProvider renders stack of toasts.

LIBRARY
-------

  src/lib/api.ts
    All HTTP calls in one place. Reads NEXT_PUBLIC_API_URL from env.
    Attaches Authorization: Bearer token from localStorage on authenticated calls.

    createShortUrl(originalUrl, options?)
      POST /url → CreateUrlResponse { shortCode, shortUrl, qrCode, hasPassword }

    getStats(code)
      GET /url/{code}/stats → UrlStats (full analytics response)

    register(email, password) / login(email, password)
      POST /auth/register|login → { access_token, user }

    getMyUrls()    GET /url/my-links → UserUrl[]
    deleteUrl(code) DELETE /url/{code}
    getApiKey()    GET /auth/api-key → { apiKey }
    generateApiKey() POST /auth/api-key/generate → { apiKey }
    verifyPassword(code, password)  POST /url/{code}/unlock → { valid, originalUrl? }

DESIGN SYSTEM (globals.css + Tailwind 4)
-----------------------------------------

  CSS custom properties in @theme block (Tailwind 4 syntax):
    Colors: background, surface, surface-light, border, border-light
    Primary palette: indigo (#6366f1 → #4f46e5)
    Accent palette: cyan (#06b6d4 → #22d3ee)
    Semantic: success (emerald), warning (amber), error (red)
    Text: text, text-muted, text-dim

  Custom utility classes:
    .glass        — dark frosted glass card (rgba bg + backdrop-filter blur 20px + border)
    .glass-light  — lighter variant (blur 12px)
    .gradient-text — indigo→cyan gradient via background-clip: text
    .gradient-border — pseudo-element gradient border (mask technique)
    .glow         — indigo box-shadow glow (20px + 60px layers)
    .glow-accent  — cyan variant


================================================================================
DATA FLOW — END TO END
================================================================================

CREATING A SHORT URL
--------------------
  User (browser)
    → POST /url { originalUrl, customAlias?, expiresAt?, maxClicks?, password?,
                   webhookUrl? }  [optional: Idempotency-Key header]
    [Idempotency check: Redis "idemp:{key}" — returns cached response if hit]
    [NestJS ValidationPipe validates DTO]
    [RateLimiterService checks IP]
    [UrlService.createShortUrl]
      → validates expiresAt
      → checkSpam(url) via Google Safe Browsing API
      → bcrypt.hash(password) if provided
      → QRCode.toDataURL(shortUrl) — data URI generated
      → setNx Redis lock "url-lock:{code}"
      → prisma.url.create()
      → release lock
      → cache result if idempotencyKey present
    ← { shortCode, shortUrl, qrCode, hasPassword, maxClicks }

REDIRECTING A SHORT URL
-----------------------
  User clicks short URL
    → GET /:code  (via frontend route.ts or directly)
    [RateLimiterService — IP check]
    [RedirectService.getOriginalUrl]
      → prisma.url.findUnique (always — needed for password/maxClicks/expiry)
      → check expiresAt → 410 if expired
      → if password set → return { requiresPassword: true }
        (frontend redirects to /:code/unlock)
      → maxClicks check: db + Redis pending >= limit → 410
      → Redis cache check → hit: return immediately
      → cache miss: set Redis with smart TTL
    [KafkaProducerService.publishClickEvent(code, ip, ua)]  ← fire and forget
      → Kafka "click-events" topic → KafkaConsumerService:
          1. redis.incr("clicks:{code}")
          2. UAParser(userAgent) → device, browser, os
          3. GeoService.lookup(ip) → country, city
          4. prisma.clickEvent.create(all enrichment fields)
          5. triggerWebhook(webhookUrl, payload) if set
          [on error] → publishToDLQ
    ← HTTP 302 redirect to originalUrl
    [Every 10s: BatchProcessor flushes Redis counters to PostgreSQL]

VIEWING ANALYTICS
-----------------
  User opens /:code/stats page
    → GET /url/:code/stats
    [AnalyticsService.getStats]
      → prisma.url.findUnique (include last 500 ClickEvents)
      → redis.get("clicks:{code}") → pendingClicks
      → aggregate browser/device/country counts
      → return full stats + top-10 lists
  Frontend displays stat cards + QR code + breakdown charts


================================================================================
SECURITY CONSIDERATIONS
================================================================================

  1. CORS restricted to FRONTEND_URL env var (not wildcard *)
  2. URL validation — @IsUrl with require_protocol + require_tld
     Rejects javascript:, data:, ftp:, bare domains
  3. Rate limiting — 10 req / 60s per IP via Redis-backed sliding window
  4. Input whitelist — ValidationPipe strips/rejects unknown fields
  5. Expiry enforcement — smart cache TTL prevents stale expired URLs
  6. Password protection — bcrypt(10) hashing; plaintext never stored
  7. Max-clicks enforcement — checked at redirect time (db + Redis buffer)
  8. Google Safe Browsing — malware/phishing detection at creation time
  9. rel="noopener noreferrer" on all external links
 10. API key not hashed in DB (prefix "snip_" makes them identifiable);
     transmitted only over HTTPS in production
 11. Reserved path set in RedirectController prevents route hijacking
     (health, metrics, url, auth, api never treated as short codes)


================================================================================
DOCKER
================================================================================

  docker-compose.yml       — Local dev (exposes DB, Redis, Kafka ports)
  docker-compose.prod.yml  — Production (env_file .env, healthchecks, HTTPS)

SERVICES
--------
  postgres   postgres:15-alpine           — primary database, named volume postgres_data
  redis      redis:7-alpine              — cache + counter store, named volume redis_data
  kafka      confluentinc/cp-kafka:7.6.1 — KRaft mode (no Zookeeper), topic auto-create,
                                           named volume kafka_data, port 9092
  backend    ./Backend/Dockerfile        — NestJS API
  frontend   ./Frontend/Dockerfile       — Next.js app
  nginx      nginx:alpine                — reverse proxy on 80 + 443

DOCKERFILES
-----------
  Backend/Dockerfile  — Multi-stage (builder → production)
    builder: node:20-slim, npm ci, prisma generate, npm run build
    production: node:20-slim, prod deps only, non-root user "nestjs"
    CMD: node dist/src/main.js — Exposes port 3001

  Frontend/Dockerfile — Multi-stage (deps → builder → runner)
    runner: node:20-alpine, non-root user "nextjs", standalone output mode
    CMD: node server.js — Exposes port 3000

NGINX (nginx/nginx.conf)
------------------------
  HTTP (80)  → 301 HTTPS redirect (except ACME challenges)
  HTTPS (443) → TLS termination (Let's Encrypt, TLSv1.2 + TLSv1.3)
    /api/*  → proxy_pass http://backend:3001/  (strips /api prefix)
    /*      → proxy_pass http://frontend:3000

HEALTHCHECKS (docker-compose.prod.yml)
  backend  — HTTP GET /health, 10s interval, 3 retries, 40s start_period
  frontend — HTTP GET /, 30s interval, 3 retries, 20s start_period
  nginx depends on healthy backend + frontend


================================================================================
CI/CD PIPELINE (.github/workflows/deploy.yml)
================================================================================

Trigger: push to main branch

  test   — ubuntu-latest: npm ci → npm test (unit tests must pass)
  deploy — runs after test: SSH into EC2 → git pull → docker compose up -d --build
           → docker image prune -f


================================================================================
PRODUCTION DEPLOYMENT NOTES
================================================================================

  ENVIRONMENT VARIABLES
    DATABASE_URL              — PostgreSQL connection string (required)
    REDIS_URL                 — Redis connection string
    KAFKA_BROKERS             — Comma-separated brokers (e.g. kafka:9092)
    BASE_URL                  — Public API base URL (used in shortUrl response)
    FRONTEND_URL              — Frontend origin for CORS
    PORT                      — Default 3001
    NODE_ENV                  — Set to "production"
    JWT_SECRET                — Secret for signing JWTs (required for auth)
    GOOGLE_SAFE_BROWSING_API_KEY — Optional; spam check skipped if absent

  FRONTEND
    NEXT_PUBLIC_API_URL — Set to /api (Nginx rewrites to backend port)

  WORKER PROCESSES
    Currently batch.processor.ts + Kafka consumer run in the same Node process
    as the API (main.ts side-effect import + embedded microservice).
    For production scale, separate into:
      — Process 1: API server + Kafka consumer
      — Process 2: Batch processor standalone

  DATABASE
    Run migrations: npx prisma migrate deploy
    Consider managed DB (RDS, Neon) for production.

  REDIS
    Use managed Redis (Upstash, Redis Cloud, ElastiCache) with TLS (rediss://).


================================================================================
PROJECT FILE REFERENCE
================================================================================

Backend:
  src/main.ts                                   — Bootstrap, Swagger, CORS, Kafka microservice
  src/app.module.ts                             — Root module wiring
  src/config/env.validation.ts                  — Joi env schema
  src/prisma/prisma.service.ts                  — PrismaClient wrapper
  src/redis/redis.constants.ts                  — REDIS_CLIENT symbol token
  src/redis/redis.module.ts                     — Global Redis module (factory)
  src/redis/redis.service.ts                    — get/set/del/incr/setNx wrapper
  src/common/rate-limiter.service.ts            — IP rate limiting (Redis)
  src/geo/geo.module.ts                         — GeoModule (exports GeoService)
  src/geo/geo.service.ts                        — ip-api.com lookup with 2s timeout
  src/kafka/kafka.module.ts                     — Kafka client registration
  src/kafka/kafka.producer.service.ts           — Publishes to click-events + DLQ topics
  src/kafka/kafka.consumer.service.ts           — Enriches click events, writes ClickEvent, fires webhooks
  src/queue/queue.service.ts                    — BullMQ producer (kept, inactive)
  src/queue/worker.ts                           — BullMQ consumer (kept, inactive)
  src/queue/batch.processor.ts                  — Periodic Redis→DB flush (active)
  src/health/health.controller.ts               — GET /health
  src/health/health.module.ts                   — Health module
  src/modules/auth/auth.dto.ts                  — RegisterDto, LoginDto
  src/modules/auth/auth.service.ts              — register, login, generateApiKey, getApiKey
  src/modules/auth/auth.controller.ts           — POST /auth/register|login, GET|POST /auth/api-key
  src/modules/auth/auth.module.ts               — Auth module wiring (JWT, Passport)
  src/modules/auth/jwt.strategy.ts             — PassportStrategy(Strategy) for JWT
  src/modules/auth/jwt-auth.guard.ts            — JwtAuthGuard + OptionalJwtAuthGuard
  src/modules/auth/api-key.guard.ts             — ApiKeyGuard (x-api-key header)
  src/modules/url/create-url.dto.ts             — Full CreateUrlDto with all optional fields
  src/modules/url/url.service.ts                — URL creation, QR, spam check, password, lock
  src/modules/url/url.controller.ts             — POST /url, GET /url/my-links, DELETE, unlock, stats
  src/modules/url/url.module.ts                 — URL module wiring
  src/modules/redirect/redirect.service.ts      — Cache-first redirect with password/maxClicks checks
  src/modules/redirect/redirect.controller.ts   — GET /:code (reserved path guard + Kafka publish)
  src/modules/redirect/redirect.module.ts       — Redirect module wiring
  src/modules/analytics/analytics.service.ts    — DB + Redis + ClickEvent aggregation
  src/modules/analytics/analytics.module.ts     — Analytics module wiring
  prisma/schema.prisma                          — User, Url, ClickEvent models

Backend Tests:
  src/modules/url/url.service.spec.ts           — UrlService unit tests
  src/modules/url/url.controller.spec.ts        — UrlController unit tests
  src/modules/redirect/redirect.service.spec.ts — RedirectService unit tests
  src/modules/redirect/redirect.controller.spec.ts — RedirectController unit tests
  src/modules/analytics/analytics.service.spec.ts  — AnalyticsService unit tests

Frontend:
  src/app/layout.tsx                            — Root layout, font, AuthProvider, Header
  src/app/page.tsx                              — Home page (URL form + advanced options + recent links)
  src/app/[code]/route.ts                       — Frontend redirect handler (password check)
  src/app/[code]/unlock/page.tsx                — Password entry page
  src/app/[code]/stats/page.tsx                 — Full analytics page (charts + QR + details)
  src/app/dashboard/page.tsx                    — User's link list + API key management
  src/app/bulk/page.tsx                         — Bulk URL shortener (up to 20 at once)
  src/app/login/page.tsx                        — Login form
  src/app/register/page.tsx                     — Register form
  src/app/guide/page.tsx                        — Product feature guide
  src/app/globals.css                           — Design tokens + utility classes
  src/lib/api.ts                                — Full API client (all endpoints)
  src/components/AuthProvider.tsx               — JWT context (localStorage-backed)
  src/components/Header.tsx                     — Nav bar with auth state + theme toggle
  src/components/ThemeToggle.tsx                — Dark/light theme switcher
  src/components/RecentLinks.tsx                — LocalStorage-backed recent links list
  src/components/Toast.tsx                      — Global toast notification system

Infrastructure:
  docker-compose.yml                            — Local dev (DB+Redis+Kafka ports exposed)
  docker-compose.prod.yml                       — Production (healthchecks, SSL, Kafka)
  Backend/Dockerfile                            — Multi-stage NestJS image
  Frontend/Dockerfile                           — Multi-stage Next.js image (standalone)
  nginx/nginx.conf                              — Nginx reverse proxy (HTTP→HTTPS, /api routing)
  .github/workflows/deploy.yml                  — CI/CD: test → SSH deploy

================================================================================
