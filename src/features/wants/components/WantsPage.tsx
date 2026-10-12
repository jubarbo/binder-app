import { useState } from 'react'
import { useBinderStore } from '@/features/binder/state/binderStore'
import WantEntryForm from '@/features/wants/components/WantEntryForm'

export default function WantsPage() {
  const wants = useBinderStore((state) => state.wants)
  const [showForm, setShowForm] = useState(false)

  return (
    <section className="page">
      <h1>Deseos</h1>
      <button className="btn btn--primary" onClick={() => setShowForm(!showForm)}>
        {showForm ? 'Ocultar' : 'Agregar deseo'}
      </button>
      {showForm && <WantEntryForm onSubmit={() => setShowForm(false)} />}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {wants.map((w) => (
          <li key={w.id} style={{ padding: 'var(--space-2)', border: '1px solid var(--color-border)', marginBottom: 'var(--space-2)' }}>
            <div>Oráculo: {w.oracleId}</div>
            <div>Cantidad: {w.quantity}</div>
            {w.preferredPrintingId && <div>Impresión: {w.preferredPrintingId}</div>}
            
          </li>
        ))}
      </ul>
      {wants.length === 0 && <p>Sin deseos</p>}
    </section>
  )
}