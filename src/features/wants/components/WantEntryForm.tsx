import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useBinderStore } from '@/features/binder/state/binderStore'

const schema = z.object({
  oracleId: z.string().min(1, 'Requerido'),
  quantity: z.coerce.number().int().min(1).max(99),
  preferredPrintingId: z.string().optional(),
})

type FormInput = z.input<typeof schema>
type FormOutput = z.output<typeof schema>

interface Props {
  onSubmit?: () => void
}

export default function WantEntryForm({ onSubmit }: Props) {
  const addWant = useBinderStore((s) => s.addWant)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: { quantity: 1 },
  })

  const submit = (data: FormOutput) => {
    addWant({
      id: crypto.randomUUID(),
      oracleId: data.oracleId,
      quantity: data.quantity,
      preferredPrintingId: data.preferredPrintingId || undefined,
      priority: 'normal',
    })
    reset()
    onSubmit?.()
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="want-form">
      <input
        {...register('oracleId')}
        placeholder="ID de oráculo"
        className="field"
      />
      {errors.oracleId?.message && <span className="field-error" role="alert">{errors.oracleId.message}</span>}
      <input
        {...register('quantity')}
        type="number"
        min={1}
        max={99}
        placeholder="Cantidad"
        className="field"
      />
      {errors.quantity?.message && <span className="field-error" role="alert">{errors.quantity.message}</span>}
      <input
        {...register('preferredPrintingId')}
        placeholder="ID de impresión (opcional)"
        className="field"
      />
      <button type="submit" className="btn btn--primary">Agregar deseo</button>
    </form>
  )
}
