import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Card3D from '@/features/binder/components/Card3D'
import type { BinderEntry, Printing } from '@/shared/types/mtg'

describe('Card3D', () => {
  it('renders with image and alt', () => {
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
})
