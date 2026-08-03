import {
  CalendarCheck,
  Gamepad2,
  LayoutDashboard,
  Library,
  Mail,
  Settings,
  ShieldCheck,
  UserCog,
  Users,
} from 'lucide-react'
import { type SidebarData } from '../types'

export type SidebarArea = 'app' | 'admin'

/** Área do usuário: só o que já funciona. Feed/grupos/ranking entram na Fase 4. */
const userSidebarData: SidebarData = {
  user: { name: '', email: '', avatar: '' },
  teams: [{ name: 'eVOLUTA Gamers', logo: Gamepad2, plan: 'Meus jogos' }],
  navGroups: [
    {
      title: 'Jogar',
      items: [
        { title: 'Painel', url: '/app', icon: LayoutDashboard },
        { title: 'Meu catálogo', url: '/app/catalogo', icon: Library },
        { title: 'Rotina do mês', url: '/app/rotina', icon: CalendarCheck },
      ],
    },
    {
      title: 'Conta',
      items: [{ title: 'Perfil', url: '/app/settings', icon: UserCog }],
    },
  ],
}

/** Área do admin: gestão da plataforma, não experiência de cliente. */
const adminSidebarData: SidebarData = {
  user: { name: '', email: '', avatar: '' },
  teams: [{ name: 'eVOLUTA Gamers', logo: ShieldCheck, plan: 'Administração' }],
  navGroups: [
    {
      title: 'Plataforma',
      items: [
        { title: 'Visão geral', url: '/admin', icon: LayoutDashboard },
        { title: 'Usuários', url: '/admin/usuarios', icon: Users },
        { title: 'Convites', url: '/admin/convites', icon: Mail },
      ],
    },
    {
      title: 'Minha conta',
      items: [
        { title: 'Meu catálogo', url: '/app', icon: Gamepad2 },
        { title: 'Configurações', url: '/app/settings', icon: Settings },
      ],
    },
  ],
}

export function sidebarFor(area: SidebarArea): SidebarData {
  return area === 'admin' ? adminSidebarData : userSidebarData
}
