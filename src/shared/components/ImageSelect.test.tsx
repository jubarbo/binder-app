import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ImageSelect from '@/shared/components/ImageSelect'
import type { ImageSelectOption } from '@/shared/components/ImageSelect'

const options: ImageSelectOption[] = [
  { id: 'alpha', label: 'Alpha', meta: '#1', imageSrc: 'alpha.jpg' },
  { id: 'beta', label: 'Beta', meta: '#2', imageSrc: 'beta.jpg' },
  { id: 'gamma', label: 'Gamma' },
]

function renderSelect(
  overrides: Partial<Parameters<typeof ImageSelect>[0]> = {},
  onKeyDown?: () => void,
) {
  const onChange = vi.fn()
  render(
    <div onKeyDown={onKeyDown}>
      <ImageSelect
        label="Edición"
        placeholder="Seleccionar edición"
        value="alpha"
        options={options}
        onChange={onChange}
        {...overrides}
      />
    </div>,
  )
  return onChange
}

/** Decorative thumbnails are hidden from the accessibility tree, so they are queried by class. */
const thumbs = () => document.querySelectorAll('.image-select-thumb')

describe('ImageSelect', () => {
  it('shows the selected label on the trigger', () => {
    renderSelect()
    expect(screen.getByRole('button', { name: 'Edición' })).toHaveTextContent('Alpha')
  })

  it('shows the placeholder when nothing is selected', () => {
    renderSelect({ value: null })
    expect(screen.getByRole('button', { name: 'Edición' })).toHaveTextContent(
      'Seleccionar edición',
    )
  })

  it('starts collapsed and lists no option until the trigger is pressed', () => {
    renderSelect()
    expect(screen.queryByText('Gamma')).not.toBeInTheDocument()
    expect(thumbs()).toHaveLength(0)
  })

  it('lists every option with its thumbnail when the trigger is pressed', () => {
    renderSelect()
    fireEvent.click(screen.getByRole('button', { name: 'Edición' }))

    expect(screen.getByRole('button', { name: /Alpha/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Beta/ })).toBeInTheDocument()
    // Two options carry art; the one without it renders no <img> at all.
    expect(thumbs()).toHaveLength(2)
    expect(thumbs()[0]).toHaveAttribute('src', 'alpha.jpg')
    expect(
      screen.getByRole('button', { name: /Gamma/ }).querySelector('img'),
    ).toBeNull()
  })

  it('marks the selected option with aria-pressed', () => {
    renderSelect()
    fireEvent.click(screen.getByRole('button', { name: 'Edición' }))

    expect(screen.getByRole('button', { name: /Alpha/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: /Beta/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('calls onChange with the option id and collapses the panel on pick', () => {
    const onChange = renderSelect()
    fireEvent.click(screen.getByRole('button', { name: 'Edición' }))
    fireEvent.click(screen.getByRole('button', { name: /Beta/ }))

    expect(onChange).toHaveBeenCalledWith('beta')
    expect(screen.queryByText('Gamma')).not.toBeInTheDocument()
  })

  it('collapses and restores focus to the trigger on Escape', () => {
    renderSelect()
    const trigger = screen.getByRole('button', { name: 'Edición' })
    fireEvent.click(trigger)
    fireEvent.keyDown(trigger, { key: 'Escape' })

    expect(screen.queryByText('Gamma')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('keeps Escape from reaching the dialog that hosts it', () => {
    const onKeyDown = vi.fn()
    renderSelect({}, onKeyDown)
    const trigger = screen.getByRole('button', { name: 'Edición' })
    fireEvent.click(trigger)
    // The first Escape closes the panel; only a second one may close the modal.
    fireEvent.keyDown(trigger, { key: 'Escape' })

    expect(onKeyDown).not.toHaveBeenCalled()
  })
})
