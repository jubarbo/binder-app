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
      {wants.length === 0 ? (
        <p className="wants-empty">Sin deseos todavía. Agrega una carta que quieras conseguir.</p>
      ) : (
        <ul className="wants-list">
          {wants.map((w) => (
            <li key={w.id} className="want-item">
              <dl className="want-item-fields">
                <div className="want-item-row">
                  <dt>Oráculo:</dt>
                  <dd>{w.oracleId}</dd>
                </div>
                <div className="want-item-row">
                  <dt>Cantidad:</dt>
                  <dd>{w.quantity}</dd>
                </div>
                {w.preferredPrintingId && (
                  <div className="want-item-row">
                    <dt>Impresión:</dt>
                    <dd>{w.preferredPrintingId}</dd>
                  </div>
                )}
              </dl>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}