import { useBinderStore } from '../../binder/state/binderStore'

/**
 * Placeholder wants page (T1). Renders a heading and the current want count
 * so routing and the persisted store are provable. Real wants UI lands in T5.
 */
export default function WantsPage() {
  const wants = useBinderStore((state) => state.wants)

  return (
    <section className="page">
      <h1>Wants</h1>
      <p>{wants.length} wants</p>
    </section>
  )
}