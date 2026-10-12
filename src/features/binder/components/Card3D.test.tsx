import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Card3D from '@/features/binder/components/Card3D'
import type { BinderEntry, Printing } from '@/shared/types/mtg'

const entry: BinderEntry = { id: 'e1', printingId: 'p1', quantity: 1, condition: 'NM', language: 'en', forTrade: true }

const printing: Printing = {
  id: 'p1',
  oracleId: 'o1',
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
