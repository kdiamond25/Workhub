import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/app.html?error=no_code', request.url))
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
      return NextResponse.redirect(new URL(`/app.html?error=${encodeURIComponent(tokens.error_description || tokens.error)}`, request.url))
    }

    const expiry = Date.now() + 3500000

    // Encode tokens as base64 to avoid any character escaping issues
    const tokenB64 = Buffer.from(tokens.access_token).toString('base64')
    const refreshB64 = tokens.refresh_token ? Buffer.from(tokens.refresh_token).toString('base64') : ''

    const html = `<!DOCTYPE html>
<html>
<head><title>WorkHub - Connecting...</title>
<style>
body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f4f4f0;}
.box{background:#fff;padding:40px 50px;border:1px solid #e8e8e4;text-align:center;}
h2{color:#534AB7;margin-bottom:8px;font-size:20px;}p{color:#666;font-size:14px;}
</style>
</head>
<body>
<div class="box"><h2>✓ Gmail Connected</h2><p>Loading WorkHub...</p></div>
<script>
(function() {
  try {
    // Decode base64 encoded tokens
    var tokenB64 = '${tokenB64}';
    var refreshB64 = '${refreshB64}';
    var expiry = '${expiry}';
    
    var token = atob(tokenB64);
    
    localStorage.setItem('wh_token', token);
    localStorage.setItem('wh_expiry', expiry);
    if (refreshB64) {
      localStorage.setItem('wh_refresh', atob(refreshB64));
    }
    localStorage.setItem('wh_authed', 'true');
    
    var saved = localStorage.getItem('wh_token');
    console.log('Token saved:', saved ? 'YES length=' + saved.length : 'FAILED');
  } catch(err) {
    console.error('Storage error:', err);
  }
  
  setTimeout(function() {
    window.location.replace('/app.html?connected=true');
  }, 800);
})();
</script>
</body>
</html>`

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-store',
      },
    })

  } catch (e) {
    console.error('Callback error:', e)
    return NextResponse.redirect(new URL('/app.html?error=server_error', request.url))
  }
}
