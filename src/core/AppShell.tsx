import { Outlet } from '@tanstack/react-router'
import { Topbar } from './Topbar'
import { Footer } from './Footer'

export function AppShell() {
  return (
    <div className="app-shell">
      <Topbar />
      <main className="workspace">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
