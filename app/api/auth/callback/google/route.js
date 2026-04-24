import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/?error=no_code', request.url))
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/callback/google`,
        grant_type: 'authorization_code',
      }),
    })

    const tokens = await tokenRes.json()

    if (tokens.error) {
      return NextResponse.redirect(new URL(`/?error=${tokens.error}`, request.url))
    }

    const response = NextResponse.redirect(new URL('/', request.url))
    response.cookies.set('access_token', tokens.access_token, {
      httpOnly: true, secure: true, maxAge: 3600, path: '/'
    })
    if (tokens.refresh_token) {
      response.cookies.set('refresh_token', tokens.refresh_token, {
        httpOnly: true, secure: true, maxAge: 60 * 60 * 24 * 30, path: '/'
      })
    }
    return response
  } catch (e) {
    return NextResponse.redirect(new URL(`/?error=token_exchange_failed`, request.url))
  }
}
