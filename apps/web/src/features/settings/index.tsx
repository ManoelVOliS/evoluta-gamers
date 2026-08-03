import { Outlet } from '@tanstack/react-router'
import {
  Gamepad2,
  Joystick,
  Monitor,
  Bell,
  Palette,
  Wrench,
  UserCog,
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { SidebarNav } from './components/sidebar-nav'

const sidebarNavItems = [
  {
    title: 'Perfil',
    href: '/app/settings',
    icon: <UserCog size={18} />,
  },
  {
    title: 'Conta',
    href: '/app/settings/account',
    icon: <Wrench size={18} />,
  },
  {
    title: 'Steam',
    href: '/app/settings/steam',
    icon: <Gamepad2 size={18} />,
  },
  {
    title: 'Epic Games',
    href: '/app/settings/epic',
    icon: <Joystick size={18} />,
  },
  {
    title: 'Aparência',
    href: '/app/settings/appearance',
    icon: <Palette size={18} />,
  },
  {
    title: 'Notificações',
    href: '/app/settings/notifications',
    icon: <Bell size={18} />,
  },
  {
    title: 'Exibição',
    href: '/app/settings/display',
    icon: <Monitor size={18} />,
  },
]

export function Settings() {
  return (
    <>
      {/* ===== Top Heading ===== */}
      <Header>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main fixed>
        <div className='space-y-0.5'>
          <h1 className='text-2xl font-bold tracking-tight md:text-3xl'>
            Configurações
          </h1>
          <p className='text-muted-foreground'>
            Gerencie seu perfil, conta Steam e preferências.
          </p>
        </div>
        <Separator className='my-4 lg:my-6' />
        <div className='flex flex-1 flex-col space-y-2 overflow-hidden md:space-y-2 lg:flex-row lg:space-y-0 lg:space-x-12'>
          <aside className='top-0 lg:sticky lg:w-1/5'>
            <SidebarNav items={sidebarNavItems} />
          </aside>
          <div className='flex w-full overflow-y-hidden p-1'>
            <Outlet />
          </div>
        </div>
      </Main>
    </>
  )
}
