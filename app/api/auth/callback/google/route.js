import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return new Response(`<html><body><p>Error: No code provided</p></body></html>`, {
      headers: { 'Content-Type': 'text/html' }
    })
  }

  const baseUrl = process.env.NEXTAUTH_URL || `https://${request.headers.get('host')}`
  const redirectUri = `${baseUrl}/api/auth/callback/google`

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    const tokens = await tokenRes.json()

    if (tokens.error) {
      console.error('Token error:', JSON.stringify(tokens))
      return new Response(`<html><body><p>Auth error: ${tokens.error}</p></body></html>`, {
        headers: { 'Content-Type': 'text/html' }
      })
    }

    const expiry = Date.now() + 3500000
    const token = tokens.access_token
    const half = Math.ceil(token.length / 2)
    const part1 = Buffer.from(token.slice(0, half)).toString('base64')
    const part2 = Buffer.from(token.slice(half)).toString('base64')

    // Cookie options - NOT HttpOnly so JS can also read them
    const cookieOpts = `Path=/; Max-Age=3500; SameSite=Lax; Secure`

    const html = `<!DOCTYPE html>
<html>
<head><title>WorkHub - Connecting...</title></head>
<body style="font-family:sans-serif;text-align:center;padding:50px">
<h2>✓ Gmail Connected — Loading WorkHub...</h2>
<p>Please wait...</p>
<script>
  try {
    // Write to localStorage for client-side boot.js
    const p1 = '${part1}';
    const p2 = '${part2}';
    const token = atob(p1) + atob(p2);
    const expiry = '${expiry}';
    localStorage.setItem('wh_token', token);
    localStorage.setItem('wh_expiry', expiry);
    console.log('Token saved to localStorage, length:', token.length);
  } catch(e) {
    console.error('localStorage write failed:', e);
  }
  setTimeout(() => { window.location.href = '/app.html?connected=true'; }, 800);
<\/script>
</body>
</html>`

    const response = new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' }
    })

    // Set cookies for server-side API routes (gmail/route.js reads these)
    response.headers.append('Set-Cookie', `wh_t1=${part1}; ${cookieOpts}`)
    response.headers.append('Set-Cookie', `wh_t2=${part2}; ${cookieOpts}`)
    response.headers.append('Set-Cookie', `wh_exp=${expiry}; Path=/; Max-Age=3500; SameSite=Lax; Secure`)
    if (tokens.refresh_token) {
      const rt = Buffer.from(tokens.refresh_token).toString('base64')
      response.headers.append('Set-Cookie', `wh_rt=${rt}; Path=/; Max-Age=2592000; SameSite=Lax; Secure`)
    }

    return response

  } catch (e) {
    console.error('Callback error:', e)
    return new Response(`<html><body><p>Server error: ${e.message}</p></body></html>`, {
      headers: { 'Content-Type': 'text/html' }
    })
  }
}
