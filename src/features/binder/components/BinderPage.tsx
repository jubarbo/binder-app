import { useBinderStore } from '../state/binderStore'

/**
 * Placeholder binder page (T1). Renders a heading and the current entry
 * counts so routing and the persisted store are provable. Real binder UI
 * lands in T2+.
 */
export default function BinderPage() {
  const entries = useBinderStore((state) => state.entries)
  const totalCards = entries.reduce((sum, entry) => sum + entry.quantity, 0)

  return (
    <section className="page">
      <h1>Binder</h1>
      <p>
        {entries.length} entries, {totalCards} cards
      </p>
    </section>
  )
}