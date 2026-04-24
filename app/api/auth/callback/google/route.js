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
      console.error('Token error:', tokens)
      return NextResponse.redirect(new URL(`/?error=${tokens.error}`, request.url))
    }

    const response = NextResponse.redirect(new URL('/?connected=true', request.url))
    
    const cookieOptions = {
      httpOnly: true,
      secure: true,
      path: '/',
      sameSite: 'lax',
    }

    response.cookies.set('access_token', tokens.access_token, {
      ...cookieOptions,
      maxAge: 3600,
    })

    if (tokens.refresh_token) {
      response.cookies.set('refresh_token', tokens.refresh_token, {
        ...cookieOptions,
        maxAge: 60 * 60 * 24 * 30,
      })
    }

    return response
  } catch (e) {
    console.error('Callback error:', e)
    return NextResponse.redirect(new URL(`/?error=callback_failed`, request.url))
  }
}
