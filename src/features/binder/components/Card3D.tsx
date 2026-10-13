import { motion } from 'motion/react'
import type { BinderEntry, Printing } from '@/shared/types/mtg'
import { useCardRock } from '@/shared/hooks/useCardRock'

interface Card3DProps {
  entry: BinderEntry
  printing: Printing
  alt: string
  hasSmall: boolean
  hasNormal: boolean
  normalLoaded: boolean
  setNormalLoaded: (loaded: boolean) => void
  quantityBadge?: React.ReactNode
  /** Opens the detail for this card; receives the card element for geometry. */
  onOpenDetail?: (element: HTMLDivElement) => void
}

export default function Card3D({
  entry,
  printing,
  alt,
  hasSmall,
  hasNormal,
  normalLoaded,
  setNormalLoaded,
  quantityBadge,
  onOpenDetail,
}: Card3DProps) {
  const { ref, style, handlers, glareStyle } = useCardRock()

  const openDetail = () => {
    if (ref.current) onOpenDetail?.(ref.current)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openDetail()
    }
  }

  const imageProps = {
    alt,
    loading: 'lazy' as const,
    draggable: false,
  }

  return (
    <motion.div
      ref={ref}
      className={`card-slot card-slot--ready${entry.quantity > 1 ? ' card-slot--stacked' : ''}`}
      style={style}
      {...handlers}
      onClick={openDetail}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Carta ${alt}, ver detalle`}
    >
      <span className="card-image-frame">
        {hasSmall && (
          <img
            className="card-image card-image--placeholder"
            src={printing.imageSmall}
            alt=""
            aria-hidden="true"
            draggable={false}
          />
        )}
        {hasNormal ? (
          <>
            <img
              className="card-image card-image--full"
              src={printing.imageNormal}
              {...imageProps}
              data-loaded={normalLoaded || !hasSmall}
              onLoad={() => setNormalLoaded(true)}
            />
            {glareStyle && (
              <motion.div
                className="card-glare"
                style={{ background: glareStyle }}
              />
            )}
          </>
        ) : (
          !hasSmall && <span className="card-slot-error-mark">Sin imagen</span>
        )}
      </span>
      {quantityBadge}
    </motion.div>
  )
}
