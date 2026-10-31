import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'motion/react'
import { toast } from 'react-toastify'
import { useBinderStore } from '@/features/binder/state/binderStore'
import { usePrinting } from '@/features/catalog/catalogQueries'
import { tradesPort, TradesUnavailableError } from '@/shared/api/tradesPort'
import type { BinderEntry, WantEntry } from '@/shared/types/mtg'

interface TradeProposalPanelProps {
  /** Who receives the proposal: identity only, never an inventory to browse. */
  counterpart: { id: string; displayName: string }
  /** The matched binder entry, pre-selected at the WhoWants entry point. */
  prefillGiveEntryId?: string | null
  /** The matched card, pre-selected at the WhoHas entry point. */
  prefillAskOracleId?: string | null
  /** Closes the overlay: success, cancel and Escape all go through it. */
  onClose: () => void
}

/** One selectable offer: my for-trade copy, resolved through the catalog. */
function GiveRow({
  entry,
  checked,
  onToggle,
}: {
  entry: BinderEntry
  checked: boolean
  onToggle: () => void
}) {
  const { data: printing } = usePrinting(entry.printingId)
  return (
    <label className="trade-propose-row">
      <input type="checkbox" checked={checked} onChange={onToggle} />
      {printing ? (
        <img
          className="trade-propose-thumb"
          src={printing.imageSmall}
          alt=""
          draggable={false}
        />
      ) : (
        <span className="trade-propose-thumb trade-propose-thumb--empty" aria-hidden="true" />
      )}
      <span className="trade-propose-name">{printing?.name ?? entry.printingId}</span>
    </label>
  )
}

/** One selectable ask: a card from my own wants registry. */
function AskRow({
  want,
  checked,
  onToggle,
}: {
  want: WantEntry
  checked: boolean
  onToggle: () => void
}) {
  return (
    <label className="trade-propose-row">
      <input type="checkbox" checked={checked} onChange={onToggle} />
      {want.imageNormal ? (
        <img className="trade-propose-thumb" src={want.imageNormal} alt="" draggable={false} />
      ) : (
        <span className="trade-propose-thumb trade-propose-thumb--empty" aria-hidden="true" />
      )}
      <span className="trade-propose-name">{want.name ?? want.oracleId}</span>
    </label>
  )
}

/**
 * The "I offer X for Y" dialog: two columns composed from my own registries
 * (for-trade copies to give, wants to ask), each side pre-selected by the
 * match that opened it. The counterpart contributes identity only — what they
 * own is their answer at response time. Same overlay choreography as
 * `ConfirmDialog`: portaled, scrim click and Escape cancel, focus moves in on
 * mount and is restored on unmount; callers own `AnimatePresence`.
 */
export default function TradeProposalPanel({
  counterpart,
  prefillGiveEntryId,
  prefillAskOracleId,
  onClose,
}: TradeProposalPanelProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const entries = useBinderStore((state) => state.entries)
  const wants = useBinderStore((state) => state.wants)

  const tradeables = entries.filter((entry) => entry.forTrade)

  const [giveIds, setGiveIds] = useState<Set<string>>(
    () => new Set(prefillGiveEntryId ? [prefillGiveEntryId] : []),
  )
  const [askIds, setAskIds] = useState<Set<string>>(
    () => new Set(prefillAskOracleId ? [prefillAskOracleId] : []),
  )
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    dialogRef.current?.focus()
    return () => previouslyFocused?.focus?.()
  }, [])

  const toggle =
    (setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) =>
    () =>
      setter((current) => {
        const next = new Set(current)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })

  // A selected id whose row is gone (flagged off, want removed) must not count:
  // blocking and submission both read what the columns actually offer.
  const selectedGive = [...giveIds].filter((id) =>
    tradeables.some((entry) => entry.id === id),
  )
  const selectedAsk = [...askIds].filter((id) =>
    wants.some((want) => want.oracleId === id),
  )
  const blocked = selectedGive.length === 0 || selectedAsk.length === 0

  const submit = async () => {
    if (blocked || sending) return
    setSending(true)
    setError(null)
    try {
      await tradesPort.proposeTrade({
        counterpartId: counterpart.id,
        give: selectedGive.map((printingId) => ({ printingId, quantity: 1 })),
        ask: selectedAsk.map((oracleId) => ({ oracleId, quantity: 1 })),
      })
      toast.success(`Propuesta enviada a ${counterpart.displayName}`)
      onClose()
    } catch (cause) {
      setError(
        cause instanceof TradesUnavailableError
          ? 'Esta acción necesita un backend conectado.'
          : 'No se pudo enviar la propuesta. Intenta de nuevo.',
      )
    } finally {
      setSending(false)
    }
  }

  return createPortal(
    <motion.div
      className="confirm-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        ref={dialogRef}
        className="trade-propose-panel"
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose()
        }}
      >
        <h2 id={titleId} className="trade-propose-title">
          Proponer trade a {counterpart.displayName}
        </h2>
        <div className="trade-propose-grid">
          <section className="trade-propose-col" aria-label="Yo doy">
            <h3 className="trade-propose-col-title">Yo doy</h3>
            {tradeables.length === 0 ? (
              <p className="card-search-status">
                No tenés cartas marcadas para intercambio.
              </p>
            ) : (
              tradeables.map((entry) => (
                <GiveRow
                  key={entry.id}
                  entry={entry}
                  checked={giveIds.has(entry.id)}
                  onToggle={toggle(setGiveIds, entry.id)}
                />
              ))
            )}
          </section>
          <section className="trade-propose-col" aria-label="Pido">
            <h3 className="trade-propose-col-title">Pido</h3>
            {wants.length === 0 ? (
              <p className="card-search-status">No tenés deseos registrados.</p>
            ) : (
              wants.map((want) => (
                <AskRow
                  key={want.id}
                  want={want}
                  checked={askIds.has(want.oracleId)}
                  onToggle={toggle(setAskIds, want.oracleId)}
                />
              ))
            )}
          </section>
        </div>
        {error && (
          <p className="trade-propose-error" role="alert">
            {error}
          </p>
        )}
        <div className="confirm-actions">
          <button
            type="button"
            className="btn btn--primary"
            onClick={submit}
            disabled={blocked || sending}
          >
            {sending ? 'Enviando…' : 'Proponer'}
          </button>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  )
}
