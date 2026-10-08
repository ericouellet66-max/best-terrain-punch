import { AdminPanel } from '@/components/admin/admin-panel'
import { AppShell } from '@/components/app-shell'

export default function PageAdmin() {
  return (
    <AppShell adminSeulement>
      <AdminPanel />
    </AppShell>
  )
}
