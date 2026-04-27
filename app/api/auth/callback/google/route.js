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
      return NextResponse.redirect(new URL(`/app.html?error=${encodeURIComponent(tokens.error_description || tokens.error)}`, request.url))
    }

    const expiry = Date.now() + 3500000
    const tokenB64 = Buffer.from(tokens.access_token).toString('base64url')
    const refreshB64 = tokens.refresh_token ? Buffer.from(tokens.refresh_token).toString('base64url') : ''

    // Pass token directly in URL hash (not stored in server logs)
    const redirectUrl = new URL('/app.html', request.url)
    redirectUrl.hash = `token=${tokenB64}&expiry=${expiry}${refreshB64 ? '&refresh=' + refreshB64 : ''}`

    return NextResponse.redirect(redirectUrl.toString())

  } catch (e) {
    return NextResponse.redirect(new URL('/app.html?error=server_error', request.url))
  }
}
