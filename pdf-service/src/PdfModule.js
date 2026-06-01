/**
 * PDF Module — HTML to PDF generation (single cohesive OOP module)
 *
 * OOP Principles Applied:
 * - Abstraction: PdfRenderer base class defines the render contract.
 * - Inheritance: PuppeteerPdfRenderer extends PdfRenderer with concrete behaviour.
 * - Encapsulation: browser lifecycle and PDF options are hidden inside renderer.
 * - Polymorphism: callers invoke render() without knowing the engine used.
 * - Single Responsibility: PdfModule handles HTTP; factory handles creation; renderer handles conversion.
 *
 * Design Pattern: Factory Method (GoF Creational)
 *
 * Reason: PDF generation may use different engines (Puppeteer, wkhtmltopdf, etc.).
 * Factory Method centralizes object creation so callers request a renderer by type
 * without coupling to concrete implementation classes.
 */

const express = require('express');

/**
 * What: Abstract renderer that converts HTML into a PDF buffer.
 * Why: HTTP layer and factory depend on a stable contract, not a specific engine.
 * How: Subclasses override render(); base throws if called directly.
 */
class PdfRenderer {
  async render(_html, _options = {}) {
    throw new Error('render() must be implemented by subclass');
  }
}

class PuppeteerPdfRenderer extends PdfRenderer {
  /**
   * What: Renders HTML to PDF using headless Chromium via Puppeteer.
   * Why: Factory-selected default engine for faithful CSS/layout in PDF output.
   * How: Launches browser, sets page content (networkidle0), calls page.pdf with format/margins, closes browser in finally.
   */
  async render(html, options = {}) {
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      return await page.pdf({
        format: options.format || 'A4',
        printBackground: true,
        margin: options.margin || { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
      });
    } finally {
      await browser.close();
    }
  }
}

class PdfRendererFactory {
  /**
   * What: Instantiates a concrete PdfRenderer by type name.
   * Why: Callers request PDF generation without importing Puppeteer directly.
   * How: Switch on type; currently only 'puppeteer' is supported.
   */
  static create(type = 'puppeteer') {
    switch (type) {
      case 'puppeteer':
        return new PuppeteerPdfRenderer();
      default:
        throw new Error(`Unsupported PDF renderer type: ${type}`);
    }
  }
}

/**
 * What: Express application wiring PDF generation HTTP API to a renderer from the factory.
 * Why: Single module owns port, middleware, routes, and renderer selection via env.
 * How: Parses JSON/HTML bodies, delegates render to factory, streams PDF response.
 */
class PdfModule {
  /**
   * What: Builds the PDF microservice app and route table.
   * Why: Encapsulates startup configuration (port, renderer type).
   * How: Stores port and PDF_RENDERER env, registers middleware and routes.
   */
  constructor(port = process.env.PORT || 8083) {
    this._port = port;
    this._rendererType = process.env.PDF_RENDERER || 'puppeteer';
    this.app = express();
    this._configureMiddleware();
    this._configureRoutes();
  }

  /** What: Registers body parsers for JSON and raw HTML. Why: Clients may POST JSON or HTML text. How: express.json and express.text limits. */
  _configureMiddleware() {
    this.app.use(express.json({ limit: '5mb' }));
    this.app.use(express.text({ type: 'text/html', limit: '5mb' }));
  }

  /** What: Normalizes request body to { html, options }. Why: Single shape for render(). How: Detects raw HTML string or { html, options } object. */
  _parseRequestBody(body) {
    if (typeof body === 'string' && body.trim().startsWith('<')) {
      return { html: body, options: {} };
    }
    if (body && body.html) {
      return { html: body.html, options: body.options || {} };
    }
    return null;
  }

  /** What: Mounts /health and POST /api/pdf/generate. Why: Public API surface. How: Factory create, render, set PDF headers or 4xx/5xx JSON errors. */
  _configureRoutes() {
    this.app.get('/health', (_req, res) => {
      res.json({ status: 'ok', service: 'pdf-service' });
    });

    this.app.post('/api/pdf/generate', async (req, res) => {
      try {
        const parsed = this._parseRequestBody(req.body);
        if (!parsed) {
          return res.status(400).json({ error: 'Request must include HTML content' });
        }

        const renderer = PdfRendererFactory.create(this._rendererType);
        const pdfBuffer = await renderer.render(parsed.html, parsed.options);

        res.set({
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="document.pdf"',
          'Content-Length': pdfBuffer.length,
        });
        res.send(pdfBuffer);
      } catch (error) {
        console.error('PDF generation failed:', error);
        res.status(500).json({ error: 'Failed to generate PDF', detail: error.message });
      }
    });
  }

  /** What: Binds HTTP server on configured port. Why: Process entry when module is loaded directly. How: app.listen and log port. */
  start() {
    this.app.listen(this._port, () => {
      console.log(`PDF service listening on port ${this._port}`);
    });
    return this.app;
  }
}

const pdfApp = new PdfModule();
pdfApp.start();

module.exports = { PdfModule, PdfRenderer, PuppeteerPdfRenderer, PdfRendererFactory };
