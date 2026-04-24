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
      return NextResponse.redirect(new URL(`/?error=${tokens.error}`, request.url))
    }

    const html = `
<!DOCTYPE html>
<html>
<head><title>Connecting...</title></head>
<body>
<script>
  document.cookie = "access_token=${tokens.access_token}; path=/; max-age=3600; SameSite=Lax";
  ${tokens.refresh_token ? `document.cookie = "refresh_token=${tokens.refresh_token}; path=/; max-age=2592000; SameSite=Lax";` : ''}
  document.cookie = "authed=true; path=/; max-age=2592000; SameSite=Lax";
  window.location.href = "/?connected=true";
</script>
<p>Connecting to Gmail... please wait.</p>
</body>
</html>`

    return new Response(html, {
      headers: { 'Content-Type': 'text/html' },
    })

  } catch (e) {
    return NextResponse.redirect(new URL(`/?error=callback_failed`, request.url))
  }
}
