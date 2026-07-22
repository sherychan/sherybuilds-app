import { next } from '@vercel/functions';

// Gate everything under /pq34 — the page itself AND every photo and audio file,
// so nothing is reachable by direct URL without the password.
export const config = {
  matcher: ['/pq34', '/pq34/:path*'],
};

const COOKIE = 'pq34_access';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const encoder = new TextEncoder();

// The cookie holds HMAC(secret, password), not the password itself. Without
// PQ34_SECRET an attacker cannot mint a valid cookie.
async function sign(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Compare digests, never raw secrets, so neither length nor content leaks
// through timing.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return null;
}

function loginPage(failed: boolean): Response {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Party Quest</title>
<style>
  html,body{ margin:0; height:100%; display:flex; align-items:center; justify-content:center;
    background:#0a120c; color:#e6f5ee; font-family:system-ui,sans-serif; text-align:center; }
  form{ display:flex; flex-direction:column; gap:.9rem; width:min(20rem,80vw); }
  h1{ font-weight:600; font-size:1.25rem; letter-spacing:.02em; margin:0 0 .2rem; }
  p{ color:#8fd9bf; margin:0 0 1rem; font-size:.95rem; }
  input{ padding:.7rem .8rem; border-radius:.5rem; border:1px solid #24422f;
    background:#0f1a13; color:#e6f5ee; font-size:1rem; }
  input:focus{ outline:2px solid #7cf5d0; outline-offset:1px; }
  button{ padding:.7rem .8rem; border-radius:.5rem; border:0; background:#7cf5d0;
    color:#06231a; font-size:1rem; font-weight:600; cursor:pointer; }
  .err{ color:#f5a3a3; font-size:.9rem; margin:0; }
</style>
</head>
<body>
  <form method="POST" action="/pq34/">
    <div>
      <h1>Party Quest: 34 Years</h1>
      <p>This one needs a password.</p>
    </div>
    <input type="password" name="password" placeholder="Password" autofocus
           autocomplete="current-password" aria-label="Password">
    <button type="submit">Enter</button>
    ${failed ? '<p class="err">Not quite. Try again.</p>' : ''}
  </form>
</body>
</html>`;

  return new Response(html, {
    status: failed ? 401 : 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

export default async function middleware(request: Request) {
  const password = process.env.PQ34_PASSWORD;
  const secret = process.env.PQ34_SECRET;

  // Fail closed: without config, nothing under /pq34 is served.
  if (!password || !secret) {
    return new Response('PQ34 access is not configured.', {
      status: 503,
      headers: { 'cache-control': 'no-store' },
    });
  }

  const expected = await sign(secret, password);

  if (request.method === 'POST') {
    const submitted = String((await request.formData()).get('password') ?? '');
    if (safeEqual(await sign(secret, submitted), expected)) {
      return new Response(null, {
        status: 303,
        headers: {
          location: '/pq34/',
          'cache-control': 'no-store',
          'set-cookie': `${COOKIE}=${expected}; Path=/pq34; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`,
        },
      });
    }
    return loginPage(true);
  }

  const cookie = readCookie(request, COOKIE);
  if (cookie && safeEqual(cookie, expected)) return next();

  return loginPage(false);
}
