import express, { type Express } from 'express';
import { extname, resolve } from 'node:path';

export function installHostedUi(app: Express, directory: string) {
  const root = resolve(directory);
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' https: data:; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
    next();
  });
  app.use(express.static(root, { setHeaders: (res, file) => {
    // Never hold on to a shell pointing at assets from the previous release.
    if (file.endsWith('.html')) res.setHeader('Cache-Control', 'no-store');
  } }));
  app.get(/.*/, (req, res, next) => {
    // Client-side routes must survive a bookmark or reload. Missing JS/images
    // and API typos must remain real 404s, not an HTML response disguised as success.
    if (req.path === '/api' || req.path.startsWith('/api/') || extname(req.path) || !req.accepts('html')) { next(); return; }
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(resolve(root, 'index.html'));
  });
}
