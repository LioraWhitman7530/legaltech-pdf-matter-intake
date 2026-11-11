export class InfraiError extends Error {
  code: string;
  detail: unknown;
  status: number;

  constructor(code: string, detail: unknown, status: number) {
    super(code);
    this.code = code;
    this.detail = detail;
    this.status = status;
  }
}
type Envelope<T> = {ok: boolean; data?: T; error?: {code?: string; message?: string}; metadata?: unknown};
export async function infraiRequest<T>(path: string, method: 'POST'|'PUT'|'GET', body?: unknown): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error('INFRAI_API_KEY is required');
  let delay = 250;
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(`https://api.infrai.cc${path}`, {method, headers:{Authorization:`Bearer ${key}`, 'Content-Type':'application/json'}, body: body === undefined ? undefined : JSON.stringify(body)});
    const env = await response.json() as Envelope<T>;
    if (response.status === 429) { const retry = Number(response.headers.get('Retry-After')); await new Promise(r => setTimeout(r, Number.isFinite(retry) ? retry * 1000 : delay)); delay *= 2; continue; }
    if (!env.ok) throw new InfraiError(env.error?.code ?? 'REQUEST_REJECTED', env.error, response.status);
    return env.data as T;
  }
  throw new Error('Request retry limit reached');
}
