import { useId } from 'react'
import { useQuery } from '@tanstack/react-query'
import { wishersPort } from '@/shared/api/wishersPort'
import type { Wisher } from '@/shared/api/wishersPort'

interface WhoWantsProps {
  /** The logical card identity: wants are matched at the oracle level. */
  oracleId: string
}

/** Avatar: the user's photo when they have one, their initial otherwise. The
 *  name is rendered under it by the caller, so both stay decorative here. */
function WisherAvatar({ wisher }: { wisher: Wisher }) {
  if (wisher.avatarUrl) {
    return (
      <img
        className="wanters-avatar"
        src={wisher.avatarUrl}
        alt=""
        draggable={false}
      />
    )
  }
  return (
    <span className="wanters-avatar wanters-avatar--initial" aria-hidden="true">
      {wisher.displayName.charAt(0).toUpperCase()}
    </span>
  )
}

/**
 * The section listing who wants this card, backed by the wishers port. With
 * the local implementation it reports nobody; the real API plugs in later
 * without touching this component or the detail.
 */
export default function WhoWants({ oracleId }: WhoWantsProps) {
  const titleId = useId()
  const { data, isPending } = useQuery({
    queryKey: ['wishers', oracleId],
    queryFn: ({ signal }) => wishersPort.wishersOf(oracleId, signal),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const wishers = data ?? []

  return (
    <section className="wanters" aria-labelledby={titleId}>
      <h2 id={titleId} className="wanters-title">
        Deseantes
      </h2>
      {isPending ? (
        <p className="card-search-status" role="status">
          Buscando deseantes…
        </p>
      ) : wishers.length === 0 ? (
        <p className="card-search-status">Nadie la desea todavía.</p>
      ) : (
        <ul className="wanters-list">
          {wishers.map((wisher) => (
            <li key={wisher.id} className="wanters-item">
              {/* The backend resolves and orders the matches; the UI only
                  projects the resolved want, so no re-sorting happens here. */}
              <span className="wanters-avatar-wrap">
                <WisherAvatar wisher={wisher} />
                <span
                  className="wanters-badge"
                  aria-label={`${wisher.wantsCopies} ${wisher.wantsCopies === 1 ? 'copia' : 'copias'}`}
                >
                  {wisher.wantsCopies}
                </span>
              </span>
              <span className="wanters-name">{wisher.displayName}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
