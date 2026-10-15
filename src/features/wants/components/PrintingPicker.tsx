import { useState } from 'react'
import { usePrintings } from '@/features/catalog/catalogQueries'
import { normalizeText } from '@/shared/utils/normalizeText'
import type { Printing } from '@/shared/types/mtg'

interface PrintingPickerProps {
  oracleId: string
  /** Printings the user already wants elsewhere: they are never offered again. */
  takenPrintingIds: Set<string>
  selected: Printing | null
  onSelect: (printing: Printing) => void
  /** Called when the panel closes: a closed panel cancels the selection. */
  onClear: () => void
}

/**
 * The optional refinement under the preview: pick one concrete printing of
 * the verified oracle card. The oracle stays the want's identity; the
 * printing only narrows it. The button only appears when more than one
 * untaken printing exists, the selected card stays shaded in place, closing
 * the panel cancels the selection, and an edition-name filter tames long
 * lists.
 */
export default function PrintingPicker({
  oracleId,
  takenPrintingIds,
  selected,
  onSelect,
  onClear,
}: PrintingPickerProps) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')
  // Eager on mount: the button is gated on the printing count, so the
  // catalog answer must arrive before the user can open the panel.
  const { data } = usePrintings(oracleId)

  const availablePrintings = (data ?? []).filter(
    (p) => !takenPrintingIds.has(p.id),
  )
  // The gate reads the card's total printing count; taked ones only shrink
  // the offered list, and nothing is offered once none remains.
  if ((data?.length ?? 0) <= 1 || availablePrintings.length === 0) return null

  const normalizedFilter = normalizeText(filter.trim())
  const visiblePrintings = normalizedFilter
    ? availablePrintings.filter((p) =>
        normalizeText(p.setName).includes(normalizedFilter),
      )
    : availablePrintings

  return (
    <div className="want-printing">
      <div className="want-printing-head">
        <button
          type="button"
          className="btn btn--ghost"
          aria-expanded={open}
          onClick={() => {
            if (open) {
              // A closed panel cancels the pending selection.
              setOpen(false)
              setFilter('')
              onClear()
            } else {
              setOpen(true)
            }
          }}
        >
          {open ? 'Ocultar impresiones' : 'Elegir impresión'}
        </button>
      </div>

      {open && (
        <div className="want-printing-panel">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onKeyDown={(e) => {
              // The picker lives inside the want form: Enter must not submit.
              if (e.key === 'Enter') e.preventDefault()
            }}
            placeholder="Buscar edición..."
            aria-label="Buscar edición"
            className="field want-printing-filter"
          />
          {visiblePrintings.length === 0 ? (
            <p className="want-form-status">Sin ediciones para tu búsqueda.</p>
          ) : (
            <ul className="want-printing-list">
              {visiblePrintings.map((printing) => (
                <li key={printing.id}>
                  <button
                    type="button"
                    className={
                      printing.id === selected?.id
                        ? 'want-printing-item want-printing-item--active'
                        : 'want-printing-item'
                    }
                    aria-pressed={printing.id === selected?.id}
                    onClick={() => onSelect(printing)}
                  >
                    <img
                      className="want-printing-img"
                      src={printing.imageSmall}
                      alt=""
                      loading="lazy"
                    />
                    <span className="want-printing-set">{printing.setName}</span>{' '}
                    <span className="want-printing-meta">
                      {`#${printing.collectorNumber} · ${printing.rarity}`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
