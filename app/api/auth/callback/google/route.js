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
      console.error('Token exchange error:', JSON.stringify(tokens))
      return new Response(`<script>location.href='/app.html?error=${encodeURIComponent(tokens.error_description || tokens.error)}'</script>`, {
        headers: { 'Content-Type': 'text/html' }
      })
    }

    const expiry = Date.now() + 3500000

    // JSON encode the entire token data — safest way to embed in HTML
    const tokenData = JSON.stringify({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      expiry: expiry
    })

    // Double-encode as base64 to safely embed in HTML without any escaping issues
    const safeData = Buffer.from(tokenData).toString('base64')

    const html = `<!DOCTYPE html>
<html>
<head>
<title>WorkHub - Connecting...</title>
<style>
body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f4f4f0}
.box{background:#fff;padding:40px 50px;border:1px solid #e8e8e4;text-align:center}
h2{color:#534AB7;margin-bottom:8px;font-size:20px}p{color:#666;font-size:14px}
#status{margin-top:12px;font-size:12px;color:#888}
</style>
</head>
<body>
<div class="box">
  <h2>&#10003; Gmail Connected</h2>
  <p>Loading WorkHub...</p>
  <div id="status">Saving credentials...</div>
</div>
<script>
(function() {
  var DATA = '${safeData}';
  var status = document.getElementById('status');
  
  try {
    var json = atob(DATA);
    var parsed = JSON.parse(json);
    
    console.log('Token length:', parsed.access_token ? parsed.access_token.length : 'MISSING');
    console.log('Token starts with:', parsed.access_token ? parsed.access_token.substring(0, 10) : 'N/A');
    
    localStorage.setItem('wh_token', parsed.access_token);
    localStorage.setItem('wh_expiry', String(parsed.expiry));
    if (parsed.refresh_token) {
      localStorage.setItem('wh_refresh', parsed.refresh_token);
    }
    
    var saved = localStorage.getItem('wh_token');
    var savedLen = saved ? saved.length : 0;
    console.log('Saved token length:', savedLen);
    
    if (savedLen > 100) {
      status.textContent = 'Connected! Redirecting...';
      status.style.color = '#0F6E56';
    } else {
      status.textContent = 'Warning: token may be incomplete (len=' + savedLen + ')';
      status.style.color = '#993C1D';
    }
  } catch(err) {
    console.error('Error saving token:', err);
    status.textContent = 'Error: ' + err.message;
    status.style.color = '#993C1D';
  }
  
  setTimeout(function() {
    window.location.replace('/app.html?connected=true');
  }, 1500);
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
    return new Response(`<script>location.href='/app.html?error=server_error'</script>`, {
      headers: { 'Content-Type': 'text/html' }
    })
  }
}
