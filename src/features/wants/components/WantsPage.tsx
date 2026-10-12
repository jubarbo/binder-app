import { useState } from 'react'
import { useBinderStore } from '../../binder/state/binderStore'
import WantEntryForm from './WantEntryForm'

export default function WantsPage() {
  const wants = useBinderStore((state) => state.wants)
  const [showForm, setShowForm] = useState(false)

  return (
    <section className="page">
      <h1>Wants</h1>
      <button onClick={() => setShowForm(!showForm)}>
        {showForm ? 'Ocultar' : 'Agregar want'}
      </button>
      {showForm && <WantEntryForm onSubmit={() => setShowForm(false)} />}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {wants.map((w) => (
          <li key={w.id} style={{ padding: 'var(--space-2)', border: '1px solid var(--color-border)', marginBottom: 'var(--space-2)' }}>
            <div>Oracle: {w.oracleId}</div>
            <div>Cantidad: {w.quantity}</div>
            {w.preferredPrintingId && <div>Printing: {w.preferredPrintingId}</div>}
            
          </li>
        ))}
      </ul>
      {wants.length === 0 && <p>Sin wants</p>}
    </section>
  )
}