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
        placeholder="Oracle ID"
        className="add-card-input"
      />
      {errors.oracleId?.message && <span>{errors.oracleId.message}</span>}
      <input
        {...register('quantity')}
        type="number"
        min={1}
        max={99}
        placeholder="Cantidad"
        className="add-card-input"
      />
      {errors.quantity?.message && <span>{errors.quantity.message}</span>}
      <input
        {...register('preferredPrintingId')}
        placeholder="Printing ID (opcional)"
        className="add-card-input"
      />
      <button type="submit">Agregar want</button>
    </form>
  )
}
