import { useId } from 'react'
import { useQuery } from '@tanstack/react-query'
import { offersPort } from '@/shared/api/offersPort'
import type { Offerer } from '@/shared/api/offersPort'

interface WhoHasProps {
  /** The logical card identity: offers are matched at the oracle level. */
  oracleId: string
}

/**
 * Compact avatar stack shown inline in a want row. Unlike the detail's
 * "La buscan" section, this projects no names and no per-user badge — it only
 * surfaces that the card is available and from how many users, so the list row
 * stays readable. The count text carries the meaning; the faces are decorative.
 */
function OwnerStack({ offerers }: { offerers: Offerer[] }) {
  return (
    <span className="want-owners" title={offerers.map((o) => o.displayName).join(', ')}>
      <span className="want-owners-faces" aria-hidden="true">
        {offerers.map((owner) =>
          owner.avatarUrl ? (
            <img
              key={owner.id}
              className="want-owners-avatar"
              src={owner.avatarUrl}
              alt=""
              title={owner.displayName}
              draggable={false}
            />
          ) : (
            <span
              key={owner.id}
              className="want-owners-avatar want-owners-avatar--initial"
              title={owner.displayName}
            >
              {owner.displayName.charAt(0).toUpperCase()}
            </span>
          ),
        )}
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
 * the list.
 */
export default function WhoHas({ oracleId }: WhoHasProps) {
  const countId = useId()
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
      <OwnerStack offerers={data} />
      <span id={countId} className="sr-only">
        La tienen: {data.map((o) => o.displayName).join(', ')}
      </span>
    </span>
  )
}
