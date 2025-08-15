import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import cors from 'cors';
import bodyParser from 'body-parser';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

// Configuración de middleware para el backend
app.use(cors({
  origin: 'https://72.60.31.237',
  credentials: true
}));
app.use(bodyParser.json());

/**
 * Endpoints API para el backend
 */
app.post('/api/login', (req, res) => {
  // Este endpoint será manejado por tu lógica de backend real
  res.status(501).json({ error: 'Implementar lógica de login' });
});

app.get('/api/deliveries', (req, res) => {
  res.status(501).json({ error: 'Implementar lógica de deliveries' });
});

// Agrega aquí más endpoints API según necesites

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point.
 */
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, () => {
    console.log(`Server running on https://72.60.31.237:${port}`);
    console.log(`API endpoints available at https://72.60.31.237:${port}/api`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);