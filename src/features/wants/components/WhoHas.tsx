import { useId } from 'react'
import { useQuery } from '@tanstack/react-query'
import { offersPort } from '@/shared/api/offersPort'
import type { Offerer } from '@/shared/api/offersPort'
import { useTradeProposalStore } from '@/features/trades/state/tradeProposalStore'

interface WhoHasProps {
  /** The logical card identity: offers are matched at the oracle level. */
  oracleId: string
}

/**
 * Compact avatar stack shown inline in a want row. Unlike the detail's
 * "La buscan" section, this projects no visible names: the count text carries
 * the meaning and each face is a button that opens the trade proposal panel,
 * carrying the holder's name for assistive technology only.
 */
function OwnerStack({
  offerers,
  onProposeTrade,
}: {
  offerers: Offerer[]
  onProposeTrade: (offerer: Offerer) => void
}) {
  return (
    <span className="want-owners" title={offerers.map((o) => o.displayName).join(', ')}>
      <span className="want-owners-faces">
        {offerers.map((owner) => (
          <button
            key={owner.id}
            type="button"
            className={`want-owners-avatar${
              owner.avatarUrl ? '' : ' want-owners-avatar--initial'
            } want-owners-face`}
            title={owner.displayName}
            aria-label={owner.displayName}
            onClick={() => onProposeTrade(owner)}
          >
            {owner.avatarUrl ? (
              <img src={owner.avatarUrl} alt="" draggable={false} />
            ) : (
              owner.displayName.charAt(0).toUpperCase()
            )}
          </button>
        ))}
      </span>
      <span className="want-owners-count">
        {offerers.length === 1 ? '1 la tiene' : `${offerers.length} la tienen`}
      </span>
    </span>
  )
}

/**
 * The compact "La tienen" indicator for a want row, backed by the offers port.
 * With the local implementation it reports nobody and projects nothing, keeping
 * the row clean; the real API plugs in later without touching this component or
 * the list. Each face is the trade proposal entry point for that holder.
 */
export default function WhoHas({ oracleId }: WhoHasProps) {
  const countId = useId()
  const openTradeProposal = useTradeProposalStore((state) => state.openTradeProposal)
  const { data, isPending } = useQuery({
    queryKey: ['offers', oracleId],
    queryFn: ({ signal }) => offersPort.offersOf(oracleId, signal),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  // Compact contract: while pending or empty, the row renders nothing at all —
  // no per-row "Nadie la tiene" filler, and no layout jump once offers resolve.
  if (isPending || !data || data.length === 0) return null

  return (
    <span className="want-item-owners" aria-labelledby={countId}>
      <OwnerStack
        offerers={data}
        onProposeTrade={(offerer) =>
          openTradeProposal({
            counterpart: { id: offerer.id, displayName: offerer.displayName },
            prefillAskOracleId: oracleId,
          })
        }
      />
      <span id={countId} className="sr-only">
        La tienen: {data.map((o) => o.displayName).join(', ')}
      </span>
    </span>
  )
}
