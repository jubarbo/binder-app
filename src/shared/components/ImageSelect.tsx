import { useRef, useState } from 'react'

/** One row of the picker: a label, an optional secondary line and its art. */
export interface ImageSelectOption {
  /** Stable identity of the option; what `onChange` reports back. */
  id: string
  label: string
  meta?: string
  /** Thumbnail source. Options without art render no image, never a broken one. */
  imageSrc?: string
}

interface ImageSelectProps {
  /** Accessible name of the control, e.g. `Edición`. */
  label: string
  /** Visible text while nothing is selected. */
  placeholder: string
  /** Id of the selected option, or null when the user has not chosen yet. */
  value: string | null
  options: ImageSelectOption[]
  /** A pick happened: the panel closes and focus returns to the trigger. */
  onChange: (id: string) => void
}

/**
 * A select that can show a thumbnail per option, which a native
 * `<select>`/`<option>` cannot: images inside options are not valid HTML.
 * Built on the same shape as the wants `PrintingPicker` — a trigger button and
 * an inline panel of option buttons (`aria-pressed` marks the current one) —
 * so no second dropdown vocabulary and no new dependency.
 *
 * Escape closes the panel and stops there: the first press leaves the modal
 * alone, a second one closes it.
 */
export default function ImageSelect({
  label,
  placeholder,
  value,
  options,
  onChange,
}: ImageSelectProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const selected = options.find((option) => option.id === value) ?? null

  const close = () => {
    setOpen(false)
    triggerRef.current?.focus()
  }

  return (
    <div className="image-select">
      <button
        ref={triggerRef}
        type="button"
        className="field image-select-trigger"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((isOpen) => !isOpen)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && open) {
            // The modal listens further up: the panel owns this Escape only.
            e.stopPropagation()
            close()
          }
        }}
      >
        <span className="image-select-value">
          {selected ? selected.label : placeholder}
        </span>
        <span className="image-select-caret" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <ul className="image-select-panel" aria-label={label}>
          {options.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                className={
                  option.id === value
                    ? 'image-select-option image-select-option--active'
                    : 'image-select-option'
                }
                aria-pressed={option.id === value}
                onClick={() => {
                  onChange(option.id)
                  close()
                }}
              >
                {option.imageSrc && (
                  <img
                    className="image-select-thumb"
                    src={option.imageSrc}
                    alt=""
                    loading="lazy"
                    draggable={false}
                  />
                )}
                <span className="image-select-label">{option.label}</span>
                {option.meta && <span className="image-select-meta">{option.meta}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
