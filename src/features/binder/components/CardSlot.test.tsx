import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import CardSlot from './CardSlot'
import type { BinderEntry } from '../../../shared/types/mtg'

vi.mock('../../catalog/catalogQueries', () => ({
  usePrinting: vi.fn(),
}))

import { usePrinting } from '../../catalog/catalogQueries'

const mockUsePrinting = usePrinting as any

describe('CardSlot', () => {
  it('renders loading placeholder when pending', () => {
    mockUsePrinting.mockReturnValue({ data: undefined, isPending: true, isError: false })
    const entry: BinderEntry = { id: 'e1', printingId: 'p1', quantity: 1, condition: 'NM', language: 'en', forTrade: true }
    render(<CardSlot entry={entry} />)
    expect(screen.getByLabelText(/Loading card/i)).toBeInTheDocument()
  })

  it('renders error state when error', () => {
    mockUsePrinting.mockReturnValue({ data: undefined, isPending: false, isError: true })
    const entry: BinderEntry = { id: 'e1', printingId: 'p1', quantity: 1, condition: 'NM', language: 'en', forTrade: true }
    render(<CardSlot entry={entry} />)
    expect(screen.getByText('?')).toBeInTheDocument()
  })
})
