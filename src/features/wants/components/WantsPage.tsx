import { useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { useBinderStore } from '@/features/binder/state/binderStore'
import WantEntryForm from '@/features/wants/components/WantEntryForm'
import WantRemoveConfirm from '@/features/wants/components/WantRemoveConfirm'
import type { WantEntry } from '@/shared/types/mtg'

export default function WantsPage() {
  const wants = useBinderStore((state) => state.wants)
  const removeWant = useBinderStore((state) => state.removeWant)
  const [pendingRemoval, setPendingRemoval] = useState<WantEntry | null>(null)

  return (
    <section className="page">
      <h1>Deseos</h1>
      <WantEntryForm />
      {wants.length === 0 ? (
        <p className="wants-empty">Sin deseos todavía. Agrega una carta que quieras conseguir.</p>
      ) : (
        <ul className="wants-list">
          {wants.map((w) => (
            <li key={w.id} className="want-item">
              {w.imageNormal && (
                <img
                  className="want-item-thumb"
                  src={w.imageNormal}
                  alt=""
                  loading="lazy"
                />
              )}
              <div className="want-item-info">
                <span className="want-item-name">{w.name ?? w.oracleId}</span>
                {w.typeLine && (
                  <span className="want-item-type">{w.typeLine}</span>
                )}
                {w.preferredPrintingId && (
                  <span className="want-item-printing">
                    {w.printingLabel ?? w.preferredPrintingId}
                  </span>
                )}
                {!w.preferredPrintingId && (
                  <span className="want-item-printing want-item-printing--oracle">
                    Cualquier impresión
                  </span>
                )}
              </div>
              <span className="want-item-qty">Cantidad: {w.quantity}</span>
              <button
                type="button"
                className="want-item-remove"
                aria-label={`Retirar ${w.name ?? w.oracleId}`}
                onClick={() => setPendingRemoval(w)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <AnimatePresence>
        {pendingRemoval && (
          <WantRemoveConfirm
            want={pendingRemoval}
            onConfirm={() => {
              removeWant(pendingRemoval.id)
              setPendingRemoval(null)
            }}
            onReject={() => setPendingRemoval(null)}
          />
        )}
      </AnimatePresence>
    </section>
  )
}
