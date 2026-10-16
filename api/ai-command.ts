import { handleAiCommand } from '../src/server/aiHandler';

export default async function handler(req: any, res: any) {
  // CORS para requisições na nuvem se necessário
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    try {
      return await handleAiCommand(req, res);
    } catch (err: any) {
      console.error('Vercel API error:', err);
      return res.status(500).json({ error: err?.message || 'Erro interno ao processar comando' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
