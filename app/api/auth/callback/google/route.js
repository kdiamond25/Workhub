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
      return new Response(`<script>location.href='/app.html?error=${encodeURIComponent(tokens.error_description || tokens.error)}'</script>`, {
        headers: { 'Content-Type': 'text/html' }
      })
    }

    const expiry = Date.now() + 3500000
    const tokenB64 = Buffer.from(tokens.access_token).toString('base64url')
    const refreshB64 = tokens.refresh_token ? Buffer.from(tokens.refresh_token).toString('base64url') : ''

    // Use an HTML page that sets the hash BEFORE navigating
    // This way the hash is set by JS in the same origin, not via redirect
    const html = `<!DOCTYPE html>
<html>
<head>
<title>WorkHub - Connecting...</title>
<style>
body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f4f4f0}
.box{background:#fff;padding:40px 50px;border:1px solid #e8e8e4;text-align:center}
h2{color:#534AB7;margin-bottom:8px;font-size:20px}p{color:#666;font-size:14px}
</style>
</head>
<body>
<div class="box"><h2>✓ Gmail Connected</h2><p>Loading WorkHub...</p></div>
<script>
var TOKEN = '${tokenB64}';
var EXPIRY = '${expiry}';
var REFRESH = '${refreshB64}';

// Write to localStorage from THIS page (same origin as app.html)
try {
  localStorage.setItem('wh_token', atob(TOKEN.replace(/-/g,'+').replace(/_/g,'/')));
  localStorage.setItem('wh_expiry', EXPIRY);
  if (REFRESH) {
    localStorage.setItem('wh_refresh', atob(REFRESH.replace(/-/g,'+').replace(/_/g,'/')));
  }
  console.log('wh_token saved, length:', localStorage.getItem('wh_token').length);
} catch(e) {
  console.error('localStorage write failed:', e);
}

// Navigate to app.html after confirming write
setTimeout(function() {
  var check = localStorage.getItem('wh_token');
  console.log('Pre-navigate check:', check ? 'OK length='+check.length : 'MISSING');
  window.location.replace('/app.html?connected=true');
}, 1200);
</script>
</body>
</html>`

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-store',
        'X-Frame-Options': 'DENY',
      },
    })

  } catch (e) {
    return new Response(`<script>location.href='/app.html?error=server_error'</script>`, {
      headers: { 'Content-Type': 'text/html' }
    })
  }
}
