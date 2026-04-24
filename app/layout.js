export const metadata = {
  title: 'WorkHub — True Citrus',
  description: 'Email and project management for Kim Diamond',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          html, body { height: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; background: #f4f4f0; color: #1a1a1a; }
          input, textarea, select, button { font-family: inherit; font-size: 13px; }
          input, textarea, select { border: 1px solid #d0d0cc; border-radius: 2px; padding: 6px 10px; outline: none; background: #fff; color: #1a1a1a; }
          input:focus, textarea:focus, select:focus { border-color: #534AB7; }
          button { cursor: pointer; border: 1px solid #d0d0cc; border-radius: 2px; padding: 6px 14px; background: #fff; color: #1a1a1a; }
          button:hover { background: #f4f4f0; }
          ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #d0d0cc; }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}
