import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/?error=no_code', request.url))
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
      return NextResponse.redirect(new URL(`/?error=${tokens.error_description || tokens.error}`, request.url))
    }

    const expiry = Date.now() + 3500000
    const html = `<!DOCTYPE html>
<html>
<head><title>WorkHub - Connecting...</title>
<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f4f4f0;} .box{background:#fff;padding:40px;border-radius:4px;text-align:center;border:1px solid #e8e8e4;} h2{color:#534AB7;margin-bottom:8px;} p{color:#666;}</style>
</head>
<body>
<div class="box">
<h2>✓ Gmail Connected</h2>
<p>Loading WorkHub...</p>
</div>
<script>
(function() {
  try {
    localStorage.setItem('wh_access_token', '${tokens.access_token}');
    localStorage.setItem('wh_token_expiry', '${expiry}');
    localStorage.setItem('wh_authed', 'true');
    ${tokens.refresh_token ? `localStorage.setItem('wh_refresh_token', '${tokens.refresh_token}');` : ''}
    console.log('Token stored successfully');
  } catch(e) {
    console.error('Storage failed:', e);
  }
  setTimeout(function() {
    window.location.replace('/?connected=true');
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
    return NextResponse.redirect(new URL(`/?error=server_error`, request.url))
  }
}
