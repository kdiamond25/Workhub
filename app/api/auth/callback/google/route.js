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
      console.error('Token exchange error:', JSON.stringify(tokens))
      return NextResponse.redirect(new URL(`/?error=${tokens.error_description || tokens.error}`, request.url))
    }

    // Store tokens in sessionStorage via HTML page then redirect
    const html = `<!DOCTYPE html>
<html>
<head><title>WorkHub - Connecting...</title></head>
<body style="font-family:sans-serif;padding:40px;text-align:center;">
<h2>Connecting to Gmail...</h2>
<p>Please wait while we set up your account.</p>
<script>
try {
  sessionStorage.setItem('wh_access_token', '${tokens.access_token}');
  ${tokens.refresh_token ? `sessionStorage.setItem('wh_refresh_token', '${tokens.refresh_token}');` : ''}
  sessionStorage.setItem('wh_authed', 'true');
  sessionStorage.setItem('wh_token_expiry', Date.now() + 3500000);
} catch(e) {
  console.error('Storage error:', e);
}
setTimeout(() => { window.location.href = '/?connected=true'; }, 500);
</script>
</body>
</html>`

    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    })

  } catch (e) {
    console.error('Callback exception:', e.message)
    return NextResponse.redirect(new URL(`/?error=server_error`, request.url))
  }
}
