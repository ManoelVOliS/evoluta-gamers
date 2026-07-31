import {
  Bell,
  Bug,
  CalendarCheck,
  FileX,
  Gamepad2,
  HelpCircle,
  LayoutDashboard,
  Library,
  Lock,
  Monitor,
  Newspaper,
  Palette,
  ServerOff,
  Settings,
  ShieldCheck,
  Trophy,
  UserCog,
  UserX,
  Users,
  UsersRound,
  Wrench,
  Construction,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: '',
    email: '',
    avatar: '',
  },
  teams: [
    {
      name: 'eVOLUTA Gamers',
      logo: Gamepad2,
      plan: 'Rede fechada',
    },
  ],
  navGroups: [
    {
      title: 'Jogar',
      items: [
        {
          title: 'Painel',
          url: '/',
          icon: LayoutDashboard,
        },
        {
          title: 'Meu catálogo',
          url: '/catalogo',
          icon: Library,
        },
        {
          title: 'Rotina do mês',
          url: '/rotina',
          icon: CalendarCheck,
        },
      ],
    },
    {
      title: 'Social',
      items: [
        {
          title: 'Feed',
          url: '/feed',
          icon: Newspaper,
        },
        {
          title: 'Grupos',
          url: '/grupos',
          icon: UsersRound,
        },
        {
          title: 'Ranking',
          url: '/ranking',
          icon: Trophy,
        },
      ],
    },
    {
      title: 'Administração',
      items: [
        {
          title: 'Usuários',
          url: '/users',
          icon: Users,
        },
        {
          title: 'Moderação',
          url: '/moderacao',
          icon: ShieldCheck,
        },
      ],
    },
    {
      title: 'Outros',
      items: [
        {
          title: 'Configurações',
          icon: Settings,
          items: [
            {
              title: 'Perfil',
              url: '/settings',
              icon: UserCog,
            },
            {
              title: 'Conta',
              url: '/settings/account',
              icon: Wrench,
            },
            {
              title: 'Aparência',
              url: '/settings/appearance',
              icon: Palette,
            },
            {
              title: 'Notificações',
              url: '/settings/notifications',
              icon: Bell,
            },
            {
              title: 'Exibição',
              url: '/settings/display',
              icon: Monitor,
            },
          ],
        },
        {
          title: 'Ajuda',
          url: '/help-center',
          icon: HelpCircle,
        },
        {
          title: 'Erros',
          icon: Bug,
          items: [
            {
              title: 'Não autorizado',
              url: '/errors/unauthorized',
              icon: Lock,
            },
            {
              title: 'Proibido',
              url: '/errors/forbidden',
              icon: UserX,
            },
            {
              title: 'Não encontrado',
              url: '/errors/not-found',
              icon: FileX,
            },
            {
              title: 'Erro interno',
              url: '/errors/internal-server-error',
              icon: ServerOff,
            },
            {
              title: 'Manutenção',
              url: '/errors/maintenance-error',
              icon: Construction,
            },
          ],
        },
      ],
    },
  ],
}
