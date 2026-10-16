import CardZoom from '@/shared/components/CardZoom'
import type { OracleCard } from '@/shared/types/mtg'

interface WantCardZoomProps {
  card: OracleCard
  onClose: () => void
}

/**
 * Zoom over a verified want: the image only, deliberately. The card's name
 * already sits in the list item and the type line in the preview, so the
 * modal carries nothing but the art — Escape or the scrim close it. A
 * double-faced card lays both faces side by side, like the binder's zoom.
 */
export default function WantCardZoom({ card, onClose }: WantCardZoomProps) {
  return (
    <CardZoom
      src={card.imageNormal ?? ''}
      srcBack={card.imageNormalBack}
      alt={card.name}
      onClose={onClose}
    />
  )
}
