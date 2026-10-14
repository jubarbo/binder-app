import CardZoom from '@/shared/components/CardZoom'
import type { OracleCard } from '@/shared/types/mtg'

interface WantCardZoomProps {
  card: OracleCard
  onClose: () => void
}

/**
 * Zoom over a verified want: the shared card zoom carrying the wants copy
 * (card name as the title, type line as the caption).
 */
export default function WantCardZoom({ card, onClose }: WantCardZoomProps) {
  return (
    <CardZoom
      title={card.name}
      src={card.imageNormal ?? ''}
      alt={card.name}
      caption={card.typeLine}
      onClose={onClose}
    />
  )
}
