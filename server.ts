import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { handleAiCommand } from './src/server/aiHandler';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_BASE_URL =
  process.env.VITE_SUPABASE_URL?.trim() || 'https://vzzpvrlahbvbyccpwven.supabase.co';

async function readRawRequestBody(req: express.Request): Promise<Buffer | undefined> {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return chunks.length > 0 ? Buffer.concat(chunks) : undefined;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Proxy same-origin para o Supabase (evita bloqueios de rede/extensões no navegador)
  app.use('/api/supabase', async (req, res) => {
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'apikey,authorization,content-type,prefer,range,x-client-info,accept-profile,content-profile,x-supabase-api-version'
      );
      return res.status(204).end();
    }

    try {
      const targetUrl = `${SUPABASE_BASE_URL.replace(/\/+$/, '')}${req.url}`;
      const forwardHeaders: Record<string, string> = {};
      const allowedHeaders = [
        'apikey',
        'authorization',
        'content-type',
        'accept',
        'prefer',
        'range',
        'x-client-info',
        'accept-profile',
        'content-profile',
        'x-supabase-api-version',
      ];

      for (const headerName of allowedHeaders) {
        const value = req.headers[headerName];
        if (typeof value === 'string' && value.length > 0) {
          forwardHeaders[headerName] = value;
        }
      }

      const body = await readRawRequestBody(req);
      const upstream = await fetch(targetUrl, {
        method: req.method || 'GET',
        headers: forwardHeaders,
        body: body as any,
      });

      const passthroughHeaders = [
        'content-type',
        'content-range',
        'preference-applied',
        'x-total-count',
        'cache-control',
      ];
      for (const headerName of passthroughHeaders) {
        const val = upstream.headers.get(headerName);
        if (val) {
          res.setHeader(headerName, val);
        }
      }

      res.status(upstream.status);
      if (req.method === 'HEAD') {
        return res.end();
      }

      const buffer = Buffer.from(await upstream.arrayBuffer());
      return res.send(buffer);
    } catch (err: any) {
      console.error('Supabase local proxy error:', err);
      return res.status(502).json({
        error: 'Falha no proxy de comunicação com o Supabase',
        message: err?.message || 'Erro interno de rede',
      });
    }
  });

  app.use(express.json());

  // Rota de processamento de comandos de IA
  app.post('/api/ai-command', async (req, res) => {
    try {
      await handleAiCommand(req, res);
    } catch (err: any) {
      console.error('Erro na rota /api/ai-command:', err);
      res.status(500).json({ error: err?.message || 'Erro ao processar comando com IA' });
    }
  });

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Vite middlewares para desenvolvimento
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Servir build de produção
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
  });
}

startServer();
