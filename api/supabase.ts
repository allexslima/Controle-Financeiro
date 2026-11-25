function resolveSupabaseBaseUrl(raw?: string): string {
  const fallback = 'https://vzzpvrlahbvbyccpwven.supabase.co';
  if (!raw) return fallback;
  const trimmed = raw.trim();
  if (!trimmed) return fallback;
  if (/^https?:\/\//i.test(trimmed)) return trimmed.replace(/\/+$/, '');
  if (trimmed.includes('.')) return `https://${trimmed}`.replace(/\/+$/, '');
  return `https://${trimmed}.supabase.co`;
}

const SUPABASE_BASE_URL = resolveSupabaseBaseUrl(process.env.VITE_SUPABASE_URL);

export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawBody(req: any): Promise<Buffer | undefined> {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined;
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return Buffer.from(req.body);
  if (req.body && typeof req.body === 'object') return Buffer.from(JSON.stringify(req.body));

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return chunks.length > 0 ? Buffer.concat(chunks) : undefined;
}

export default async function handler(req: any, res: any) {
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
    let rawPath = Array.isArray(req.query?.__path)
      ? req.query.__path.join('/')
      : String(req.query?.__path || '');

    if (!rawPath && typeof req.url === 'string') {
      const stripped = req.url.split('?')[0].replace(/^\/api\/supabase\/?/, '');
      rawPath = stripped;
    }

    const targetUrl = new URL(`${SUPABASE_BASE_URL}/${rawPath.replace(/^\/+/, '')}`);

    if (req.query) {
      for (const [key, val] of Object.entries(req.query)) {
        if (key === '__path' || val === undefined) continue;
        if (Array.isArray(val)) {
          val.forEach((v) => targetUrl.searchParams.append(key, String(v)));
        } else {
          targetUrl.searchParams.set(key, String(val));
        }
      }
    }

    const forwardHeaders: Record<string, string> = {};
    const allowedHeaders = [
      'apikey',
      'authorization',
      'content-type',
      'accept',
      'prefer',
      'range',
      'range-unit',
      'x-client-info',
      'x-retry-count',
      'accept-profile',
      'content-profile',
      'x-supabase-api-version',
    ];

    for (const headerName of allowedHeaders) {
      const value = req.headers?.[headerName];
      if (typeof value === 'string' && value.length > 0) {
        forwardHeaders[headerName] = value;
      }
    }

    const body = await readRawBody(req);

    const upstream = await fetch(targetUrl.toString(), {
      method: req.method || 'GET',
      headers: forwardHeaders,
      body: body as any,
    });

    const passthroughHeaders = [
      'content-type',
      'content-range',
      'preference-applied',
      'x-total-count',
    ];
    for (const headerName of passthroughHeaders) {
      const val = upstream.headers.get(headerName);
      if (val) {
        res.setHeader(headerName, val);
      }
    }

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.status(upstream.status);

    if (req.method === 'HEAD' || upstream.status === 204 || upstream.status === 304) {
      return res.end();
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    return res.send(buffer);
  } catch (err: any) {
    console.error('Supabase proxy error:', err);
    return res.status(502).json({
      error: 'Falha no proxy de comunicação com o Supabase',
      message: err?.message || 'Erro interno de rede',
    });
  }
}
