import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { Loader2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { api, errorMessageOf } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'

const formSchema = z
  .object({
    name: z.string().min(2, 'Informe seu nome.').max(60),
    email: z.email({
      error: (iss) => (iss.input === '' ? 'Informe seu e-mail.' : undefined),
    }),
    password: z
      .string()
      .min(1, 'Informe uma senha.')
      .min(8, 'A senha precisa de pelo menos 8 caracteres.'),
    confirmPassword: z.string().min(1, 'Confirme sua senha.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não conferem.',
    path: ['confirmPassword'],
  })

type SignUpFormProps = React.HTMLAttributes<HTMLFormElement> & {
  inviteToken: string
}

export function SignUpForm({
  className,
  inviteToken,
  ...props
}: SignUpFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [done, setDone] = useState(false)
  const navigate = useNavigate()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true)
    try {
      await api.post('/auth/register', {
        name: data.name,
        email: data.email,
        password: data.password,
        inviteToken,
      })
      setDone(true)
    } catch (error) {
      toast.error(errorMessageOf(error) ?? 'Não foi possível criar a conta.')
    } finally {
      setIsLoading(false)
    }
  }

  // A conta nasce pendente: avisar aqui evita a pessoa tentar entrar e
  // achar que a senha está errada.
  if (done) {
    return (
      <div className='space-y-4'>
        <div className='rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm'>
          <p className='font-medium'>Conta criada!</p>
          <p className='text-muted-foreground mt-1'>
            Falta um administrador aprovar seu acesso. Assim que isso acontecer,
            você já consegue entrar com seu e-mail e senha.
          </p>
        </div>
        <Button
          className='w-full'
          variant='outline'
          onClick={() => void navigate({ to: '/sign-in' })}
        >
          Ir para o login
        </Button>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-3', className)}
        {...props}
      >
        <FormField
          control={form.control}
          name='name'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input placeholder='Como quer ser chamado' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail</FormLabel>
              <FormControl>
                <Input placeholder='voce@exemplo.com' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Senha</FormLabel>
              <FormControl>
                <PasswordInput placeholder='********' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='confirmPassword'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirme a senha</FormLabel>
              <FormControl>
                <PasswordInput placeholder='********' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button className='mt-2' disabled={isLoading}>
          {isLoading ? <Loader2 className='animate-spin' /> : <UserPlus />}
          Criar conta
        </Button>
      </form>
    </Form>
  )
}
