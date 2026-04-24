import { NextResponse } from 'next/server'

export async function GET(request) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
  const scope = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/drive.readonly',
    'openid','email','profile'
  ].join(' ')

  const url = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`

  return NextResponse.redirect(url)
}
