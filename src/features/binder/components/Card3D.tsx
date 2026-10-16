import { motion, useTransform } from 'motion/react'
import type { BinderEntry, Printing } from '@/shared/types/mtg'
import { useCardRock } from '@/shared/hooks/useCardRock'
import FoilLayer from '@/shared/components/FoilLayer'
import CardFlip from '@/shared/components/CardFlip'

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
  const {
    ref,
    style,
    handlers,
    glareStyle,
    rockX,
    rockY,
  } = useCardRock()
  // Holographic band: an oversized rainbow gradient the pointer slides under,
  // only for copies declared foil. Translating the layer (a composited
  // transform) instead of animating background-position keeps it off the
  // paint path, which matters with a full grid of cards.
  const foilX = useTransform(rockX, [-100, 100], ['14%', '-14%'])
  const foilY = useTransform(rockY, [-100, 100], ['14%', '-14%'])
  const isFoil = entry.finish === 'foil'

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

  const frontLayers = (
    <>
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
          {isFoil && <FoilLayer x={foilX} y={foilY} />}
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
    </>
  )

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
        <CardFlip
          back={
            printing.imageNormalBack ? (
              <>
                <img
                  className="card-image"
                  src={printing.imageNormalBack}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                />
                {isFoil && <FoilLayer x={foilX} y={foilY} />}
              </>
            ) : undefined
          }
        >
          {frontLayers}
        </CardFlip>
      </span>
      {quantityBadge}
    </motion.div>
  )
}
