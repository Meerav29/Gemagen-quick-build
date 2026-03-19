import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Quick Build — IST 130',
  description: 'The AI-powered game show where your creations get judged. May the best builder win.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body bg-[#F8FAFC] text-[#0F172A]">
        {children}
      </body>
    </html>
  )
}
