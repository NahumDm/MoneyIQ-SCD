/**
 * Integration Module — system gateway / orchestration layer
 *
 * OOP Principles Applied:
 * - Encapsulation: proxy configuration and auth validation are private methods.
 * - Abstraction: ServiceProxy hides upstream URL and header-injection details.
 * - Composition: IntegrationModule composes ServiceProxy instances per target service.
 * - Single Responsibility: validates auth, forwards requests, no business logic.
 *
 * Design Pattern: Proxy (GoF Structural)
 *
 * Reason: Clients must not call microservices directly. ServiceProxy acts as a
 * surrogate that controls access — validating tokens via auth-service and injecting
 * trusted headers before forwarding — without exposing internal service topology.
 */

import express, { Express, Request, Response, NextFunction, RequestHandler } from 'express';
import { IncomingMessage } from 'http';
import { ClientRequest } from 'http';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';

export interface ServiceTarget {
  name: string;
  baseUrl: string;
  pathPrefix: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * What: Controlled forwarder to an upstream microservice with optional header injection.
 * Why: Clients talk only to the gateway; proxy enforces path rewrite and trusted headers.
 * How: Wraps http-proxy-middleware with target URL, pathRewrite, and proxyReq hooks.
 */
export class ServiceProxy {
  constructor(
    private readonly target: ServiceTarget,
    private readonly getExtraHeaders?: (req: Request) => Record<string, string>
  ) {}

  /**
   * What: Returns Express middleware that proxies requests to the configured upstream.
   * Why: IntegrationModule mounts one proxy per service prefix.
   * How: Sets changeOrigin, rewrites path to pathPrefix, forwards Authorization and getExtraHeaders on proxyReq.
   */
  createMiddleware(): RequestHandler {
    const options: Options = {
      target: this.target.baseUrl,
      changeOrigin: true,
      pathRewrite: (path: string) => {
        // Mounted at pathPrefix; req path is often "/" — avoid "/api/expenses/" (307 redirect).
        const suffix =
          !path || path === '/' ? '' : path.startsWith('/') ? path : `/${path}`;
        return `${this.target.pathPrefix}${suffix}`;
      },
      on: {
        proxyReq: (proxyReq: ClientRequest, req: IncomingMessage) => {
          const expressReq = req as Request;
          const authHeader = expressReq.headers?.authorization;
          if (authHeader) {
            proxyReq.setHeader('Authorization', authHeader);
          }
          if (this.getExtraHeaders) {
            const extras = this.getExtraHeaders(expressReq);
            for (const [key, value] of Object.entries(extras)) {
              proxyReq.setHeader(key, value);
            }
          }
        },
        error: (_err, _req, res) => {
          if ('writeHead' in res && !res.headersSent) {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({ error: `Bad gateway: ${this.target.name} unavailable` })
            );
          }
        },
      },
    };

    return createProxyMiddleware(options) as RequestHandler;
  }
}

export class IntegrationModule {
  private readonly app: Express;
  private readonly authServiceUrl: string;
  private readonly expenseServiceUrl: string;
  private readonly pdfServiceUrl: string;

  constructor(
    private readonly port: number = parseInt(process.env.PORT || '8080', 10),
    authServiceUrl: string = process.env.AUTH_SERVICE_URL || 'http://localhost:8081',
    expenseServiceUrl: string = process.env.EXPENSE_SERVICE_URL || 'http://localhost:8082',
    pdfServiceUrl: string = process.env.PDF_SERVICE_URL || 'http://localhost:8083'
  ) {
    this.authServiceUrl = authServiceUrl;
    this.expenseServiceUrl = expenseServiceUrl;
    this.pdfServiceUrl = pdfServiceUrl;
    this.app = express();
    this._configure();
  }

  /**
   * What: Bearer-token gate that validates JWT via auth-service before expense routes run.
   * Why: Expense service trusts X-User-Id only from this layer after token verification.
   * How: OPTIONS passes through; otherwise calls auth /api/auth/validate and attaches user to req.
   */
  private _createAuthMiddleware(): RequestHandler {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (req.method === 'OPTIONS') {
        return next();
      }

      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authorization header with Bearer token required' });
      }

      try {
        const response = await fetch(`${this.authServiceUrl}/api/auth/validate`, {
          headers: { Authorization: authHeader },
        });

        if (!response.ok) {
          return res.status(401).json({ error: 'Invalid or expired token' });
        }

        req.user = (await response.json()) as AuthenticatedUser;
        next();
      } catch {
        return res.status(502).json({ error: 'Auth service unavailable' });
      }
    };
  }

  /**
   * What: Wires CORS, health, public proxies (auth, pdf), and authenticated expense proxy.
   * Why: Single place defines gateway topology and which routes require validation.
   * How: Skips express.json for body preservation; mounts ServiceProxy per pathPrefix; expense chain adds auth + X-User-Id headers.
   */
  private _configure(): void {
    // Do not use express.json() here — it consumes the request body before the proxy
    // forwards it, which causes auth/expense to fail with HttpMessageNotReadableException.

    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const origin = req.headers.origin;
      if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
      }
      res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, PATCH, DELETE, OPTIONS'
      );
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-User-Id, X-User-Email'
      );
      if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
      }
      next();
    });

    this.app.get('/health', (_req: Request, res: Response) => {
      res.json({
        status: 'ok',
        service: 'integration-layer',
        upstream: {
          auth: this.authServiceUrl,
          expense: this.expenseServiceUrl,
          pdf: this.pdfServiceUrl,
        },
      });
    });

    const publicTargets: ServiceTarget[] = [
      { name: 'auth-service', baseUrl: this.authServiceUrl, pathPrefix: '/api/auth' },
      { name: 'pdf-service', baseUrl: this.pdfServiceUrl, pathPrefix: '/api/pdf' },
    ];

    for (const target of publicTargets) {
      const proxy = new ServiceProxy(target);
      this.app.use(target.pathPrefix, proxy.createMiddleware());
    }

    const expenseTarget: ServiceTarget = {
      name: 'expense-service',
      baseUrl: this.expenseServiceUrl,
      pathPrefix: '/api/expenses',
    };

    const expenseProxy = new ServiceProxy(expenseTarget, (req: Request): Record<string, string> => {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        return {};
      }
      return { 'X-User-Id': user.id, 'X-User-Email': user.email };
    });

    this.app.use(
      expenseTarget.pathPrefix,
      this._createAuthMiddleware(),
      expenseProxy.createMiddleware()
    );

    this.app.use((_req: Request, res: Response) => {
      res.status(404).json({ error: 'Route not found' });
    });
  }

  /**
   * What: Starts the integration gateway HTTP listener.
   * Why: Entry point for the Node process hosting the facade.
   * How: Listens on constructor port and logs readiness.
   */
  start(): void {
    this.app.listen(this.port, () => {
      console.log(`Integration layer listening on port ${this.port}`);
    });
  }
}
