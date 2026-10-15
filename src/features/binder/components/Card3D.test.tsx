import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Card3D from '@/features/binder/components/Card3D'
import type { BinderEntry, Printing } from '@/shared/types/mtg'

const motionState = vi.hoisted(() => ({ reducedMotion: false }))

vi.mock('motion/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('motion/react')>()
  return { ...actual, useReducedMotion: () => motionState.reducedMotion }
})

const entry: BinderEntry = { id: 'e1', printingId: 'p1', quantity: 1, condition: 'NM', language: 'en', forTrade: true }

const printing: Printing = {
  id: 'p1',
  oracleId: 'o1',
  name: 'Test Card',
  setCode: 'TST',
  setName: 'Test Set',
  collectorNumber: '123',
  rarity: 'common',
  finishes: ['nonfoil'],
  imageSmall: '',
  imageNormal: 'http://example.com/n.png',
  imageLarge: '',
  prices: undefined,
}

describe('Card3D', () => {
  it('renders with image and alt', () => {
    render(
      <Card3D
        entry={entry}
        printing={printing}
        alt="Test Card"
        hasSmall={false}
        hasNormal={true}
        normalLoaded={true}
        setNormalLoaded={vi.fn()}
      />
    )
    expect(screen.getByRole('button')).toBeInTheDocument()
    expect(screen.getByRole('img')).toHaveAttribute('alt', 'Test Card')
  })

  it('calls onOpenDetail once when the card is clicked', () => {
    const onOpenDetail = vi.fn()
    render(
      <Card3D
        entry={entry}
        printing={printing}
        alt="Test Card"
        hasSmall={false}
        hasNormal={true}
        normalLoaded={true}
        setNormalLoaded={vi.fn()}
        onOpenDetail={onOpenDetail}
      />
    )
    fireEvent.click(screen.getByRole('button'))
    expect(onOpenDetail).toHaveBeenCalledTimes(1)
  })

  it('calls onOpenDetail once when Enter is pressed on the button', () => {
    const onOpenDetail = vi.fn()
    render(
      <Card3D
        entry={entry}
        printing={printing}
        alt="Test Card"
        hasSmall={false}
        hasNormal={true}
        normalLoaded={true}
        setNormalLoaded={vi.fn()}
        onOpenDetail={onOpenDetail}
      />
    )
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' })
    expect(onOpenDetail).toHaveBeenCalledTimes(1)
  })

  it('calls onOpenDetail once when Space is pressed on the button', () => {
    const onOpenDetail = vi.fn()
    render(
      <Card3D
        entry={entry}
        printing={printing}
        alt="Test Card"
        hasSmall={false}
        hasNormal={true}
        normalLoaded={true}
        setNormalLoaded={vi.fn()}
        onOpenDetail={onOpenDetail}
      />
    )
    fireEvent.keyDown(screen.getByRole('button'), { key: ' ' })
    expect(onOpenDetail).toHaveBeenCalledTimes(1)
  })

  it('does not activate on non-activation keys', () => {
    const onOpenDetail = vi.fn()
    render(
      <Card3D
        entry={entry}
        printing={printing}
        alt="Test Card"
        hasSmall={false}
        hasNormal={true}
        normalLoaded={true}
        setNormalLoaded={vi.fn()}
        onOpenDetail={onOpenDetail}
      />
    )
    const button = screen.getByRole('button')
    fireEvent.keyDown(button, { key: 'a' })
    fireEvent.keyDown(button, { key: 'Tab' })
    fireEvent.keyDown(button, { key: 'ArrowDown' })
    expect(onOpenDetail).not.toHaveBeenCalled()
  })

  it('handles hover motion events without errors', () => {
    render(
      <Card3D
        entry={entry}
        printing={printing}
        alt="Test Card"
        hasSmall={false}
        hasNormal={true}
        normalLoaded={true}
        setNormalLoaded={vi.fn()}
      />
    )
    const card = screen.getByRole('button')
    // Rock/lift handlers must never throw; the rocking itself is visual-only.
    fireEvent.mouseEnter(card)
    fireEvent.mouseMove(card, { clientX: 30, clientY: 40 })
    fireEvent.mouseLeave(card)
    expect(card).toHaveAttribute('aria-label', 'Carta Test Card, ver detalle')
  })

  it('no longer toggles an inline zoom overlay on click', () => {
    render(
      <Card3D
        entry={entry}
        printing={printing}
        alt="Test Card"
        hasSmall={false}
        hasNormal={true}
        normalLoaded={true}
        setNormalLoaded={vi.fn()}
        onOpenDetail={vi.fn()}
      />
    )
    const button = screen.getByRole('button')
    expect(button).not.toHaveAttribute('aria-pressed')
    fireEvent.click(button)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(button).not.toHaveClass('card-slot--zoomed')
  })
})

describe('Card3D foil layer', () => {
  const baseProps = {
    printing,
    alt: 'Test Card',
    hasSmall: false,
    hasNormal: true,
    normalLoaded: true,
    setNormalLoaded: vi.fn(),
  }

  it('renders the holographic layer when the entry is declared foil', () => {
    const { container } = render(
      <Card3D entry={{ ...entry, finish: 'foil' }} {...baseProps} />,
    )

    const foil = container.querySelector('.card-foil')
    expect(foil).not.toBeNull()
    // The layer must never eat pointer events: the card still opens on click.
    expect(foil).toHaveAttribute('aria-hidden', 'true')
  })

  it('keeps non-foil and undeclared entries flat', () => {
    const { container } = render(<Card3D entry={entry} {...baseProps} />)
    expect(container.querySelector('.card-foil')).toBeNull()

    const { container: foilless } = render(
      <Card3D entry={{ ...entry, finish: 'nonfoil' }} {...baseProps} />,
    )
    expect(foilless.querySelector('.card-foil')).toBeNull()
  })

  it('mounts the layer under reduced motion too, so the finish stays readable', () => {
    motionState.reducedMotion = true
    try {
      const { container } = render(
        <Card3D entry={{ ...entry, finish: 'foil' }} {...baseProps} />,
      )

      // Reduced motion drops the sweep, never the information: a foil copy
      // must still look different from a non-foil one at rest.
      expect(container.querySelector('.card-foil')).not.toBeNull()
      expect(container.querySelector('.card-foil-band')).not.toBeNull()
    } finally {
      motionState.reducedMotion = false
    }
  })

  it('carries a separate band inside the foil layer for the continuous sweep', () => {
    const { container } = render(
      <Card3D entry={{ ...entry, finish: 'foil' }} {...baseProps} />,
    )

    // The band owns the gradient and its own animation, so the sweep never
    // overrides the pointer transform motion writes on the parent.
    const band = container.querySelector('.card-foil-band')
    expect(band).not.toBeNull()
    expect(band?.parentElement).toHaveClass('card-foil')
  })
})
