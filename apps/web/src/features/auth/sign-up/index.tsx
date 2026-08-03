import { useQuery } from '@tanstack/react-query'
import { Link, useSearch } from '@tanstack/react-router'
import { ShieldAlert } from 'lucide-react'
import { api } from '@/lib/api-client'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AuthLayout } from '../auth-layout'
import { SignUpForm } from './components/sign-up-form'

export function SignUp() {
  const { invite } = useSearch({ from: '/(auth)/sign-up' })

  const { data, isLoading } = useQuery({
    queryKey: ['invite-check', invite],
    enabled: Boolean(invite),
    queryFn: async () =>
      (
        await api.get<{ valid: boolean }>('/auth/invite-check', {
          params: { token: invite },
        })
      ).data,
  })

  // Rede fechada: sem convite válido não há formulário para preencher.
  const blocked = !invite || (!isLoading && !data?.valid)

  return (
    <AuthLayout>
      <Card className='max-w-sm gap-4'>
        <CardHeader>
          <CardTitle className='text-lg tracking-tight'>Criar conta</CardTitle>
          <CardDescription>
            {blocked
              ? 'O eVOLUTA Gamers é uma rede fechada.'
              : 'Preencha seus dados para entrar na rede.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && invite ? (
            <p className='text-muted-foreground text-sm'>Verificando convite…</p>
          ) : blocked ? (
            <div className='space-y-4'>
              <div className='flex gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm'>
                <ShieldAlert className='mt-0.5 size-4 shrink-0' />
                <div className='space-y-1'>
                  <p className='font-medium'>
                    {invite
                      ? 'Este convite não vale mais'
                      : 'Você precisa de um convite'}
                  </p>
                  <p className='text-muted-foreground'>
                    {invite
                      ? 'Ele já foi usado, expirou ou foi revogado. Peça um link novo a um administrador.'
                      : 'O cadastro só é possível através de um link de convite enviado por um administrador.'}
                  </p>
                </div>
              </div>
              <p className='text-muted-foreground text-center text-sm'>
                Já tem conta?{' '}
                <Link
                  to='/sign-in'
                  className='hover:text-primary underline underline-offset-4'
                >
                  Entrar
                </Link>
              </p>
            </div>
          ) : (
            <SignUpForm inviteToken={invite!} />
          )}
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
