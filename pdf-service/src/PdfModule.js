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

class PdfRenderer {
  async render(_html, _options = {}) {
    throw new Error('render() must be implemented by subclass');
  }
}

class PuppeteerPdfRenderer extends PdfRenderer {
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
  static create(type = 'puppeteer') {
    switch (type) {
      case 'puppeteer':
        return new PuppeteerPdfRenderer();
      default:
        throw new Error(`Unsupported PDF renderer type: ${type}`);
    }
  }
}

class PdfModule {
  constructor(port = process.env.PORT || 8083) {
    this._port = port;
    this._rendererType = process.env.PDF_RENDERER || 'puppeteer';
    this.app = express();
    this._configureMiddleware();
    this._configureRoutes();
  }

  _configureMiddleware() {
    this.app.use(express.json({ limit: '5mb' }));
    this.app.use(express.text({ type: 'text/html', limit: '5mb' }));
  }

  _parseRequestBody(body) {
    if (typeof body === 'string' && body.trim().startsWith('<')) {
      return { html: body, options: {} };
    }
    if (body && body.html) {
      return { html: body.html, options: body.options || {} };
    }
    return null;
  }

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
