import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return new Response(`<script>location.href='/app.html?error=no_code'</script>`, {
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
      return new Response(`<script>location.href='/app.html?error=${encodeURIComponent(tokens.error_description || tokens.error)}'</script>`, {
        headers: { 'Content-Type': 'text/html' }
      })
    }

    const expiry = Date.now() + 3500000

    // Store the full token directly in the cookie (encrypted with base64)
    // Split into two cookies to handle cookie size limits
    const token = tokens.access_token
    const half = Math.ceil(token.length / 2)
    const part1 = Buffer.from(token.slice(0, half)).toString('base64')
    const part2 = Buffer.from(token.slice(half)).toString('base64')

    const cookieOpts = `Path=/; Max-Age=3500; SameSite=Lax; Secure; HttpOnly`

    const html = `<!DOCTYPE html>
<html>
<head><title>WorkHub - Connecting...</title></head>
<body>
<h2>✓ Gmail Connected — Loading WorkHub...</h2>
<script>
  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  }
  try {
    const p1 = getCookie('wh_t1');
    const p2 = getCookie('wh_t2');
    const exp = getCookie('wh_exp');
    if (p1 && p2) {
      const token = atob(p1) + atob(p2);
      localStorage.setItem('wh_token', token);
      localStorage.setItem('wh_expiry', exp || String(Date.now() + 3500000));
      console.log('Token written to localStorage, length:', token.length);
    } else {
      console.error('Cookies missing - p1:', !!p1, 'p2:', !!p2);
    }
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

    response.headers.append('Set-Cookie', `wh_t1=${part1}; ${cookieOpts}`)
    response.headers.append('Set-Cookie', `wh_t2=${part2}; ${cookieOpts}`)
    response.headers.append('Set-Cookie', `wh_exp=${expiry}; Path=/; Max-Age=3500; SameSite=Lax; Secure`)
    if (tokens.refresh_token) {
      const rt = Buffer.from(tokens.refresh_token).toString('base64')
      response.headers.append('Set-Cookie', `wh_rt=${rt}; Path=/; Max-Age=2592000; SameSite=Lax; Secure; HttpOnly`)
    }

    return response

  } catch (e) {
    console.error('Callback error:', e)
    return new Response(`<script>location.href='/app.html?error=server_error'</script>`, {
      headers: { 'Content-Type': 'text/html' }
    })
  }
}
