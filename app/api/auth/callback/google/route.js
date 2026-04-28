import { setSession, generateId } from '../../../../lib/sessions.js'

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
      console.error('Token error:', JSON.stringify(tokens))
      return new Response(`<script>location.href='/app.html?error=${encodeURIComponent(tokens.error_description || tokens.error)}'</script>`, {
        headers: { 'Content-Type': 'text/html' }
      })
    }

    // Store token server-side, give client a session ID
    const sessionId = generateId()
    setSession(sessionId, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      expiry: Date.now() + 3500000
    })

    // Set session cookie and redirect to app
    const response = new Response(`<script>location.replace('/app.html?connected=true')</script>`, {
      headers: { 'Content-Type': 'text/html' }
    })
    response.headers.set('Set-Cookie', `wh_session=${sessionId}; Path=/; Max-Age=3500; SameSite=Lax; Secure`)
    return response

  } catch (e) {
    console.error('Callback error:', e)
    return new Response(`<script>location.href='/app.html?error=server_error'</script>`, {
      headers: { 'Content-Type': 'text/html' }
    })
  }
}
