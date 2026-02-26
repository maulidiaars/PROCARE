import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'datatables.net-bs5/css/dataTables.bootstrap5.min.css'
import '@fortawesome/fontawesome-free/css/all.min.css'
import './globals.css'
import SessionTimeout from '@/components/SessionTimeout' // ← TAMBAHKAN INI

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'BNF - Material Control',
  description: 'Problem Control & follow Up System',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className={inter.className}>
        {children}
        <SessionTimeout timeoutMinutes={5} /> {/* ← TAMBAHKAN INI */}
        
        {/* Bootstrap JS - di-load di sini */}
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
        {/* jQuery & DataTables */}
        <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
        <script src="https://cdn.datatables.net/1.13.7/js/jquery.dataTables.min.js"></script>
        <script src="https://cdn.datatables.net/1.13.7/js/dataTables.bootstrap5.min.js"></script>
      </body>
    </html>
  )
}