import { createFileRoute } from '@tanstack/react-router'
import { Catalog } from '@/features/app/catalog'

export const Route = createFileRoute('/_authenticated/app/catalogo/')({
  component: Catalog,
})
