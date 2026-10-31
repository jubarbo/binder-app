import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import ImportLocalOffer from '@/features/binder/components/ImportLocalOffer'
import { importLocalBinder, useImportOfferStore } from '@/features/binder/state/binderSync'
import type { BinderEntry } from '@/shared/types/mtg'

vi.mock('@/features/binder/state/binderSync', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/binder/state/binderSync')>()
  return { ...actual, importLocalBinder: vi.fn() }
})

const entry: BinderEntry = {
  id: 'e1',
  printingId: 'p1',
  quantity: 1,
  condition: 'NM',
  language: 'en',
  forTrade: false,
}

describe('ImportLocalOffer', () => {
  beforeEach(() => {
    vi.mocked(importLocalBinder).mockReset()
    useImportOfferStore.setState({ pending: null })
  })

  it('renders nothing without guest data to import', () => {
    const { container } = render(<ImportLocalOffer />)
    expect(container).toBeEmptyDOMElement()
  })

  it('summarizes the guest data and imports it on request', async () => {
    useImportOfferStore.setState({ pending: { entries: [entry, { ...entry, id: 'e2' }], wants: [] } })
    vi.mocked(importLocalBinder).mockImplementation(async () => {
      useImportOfferStore.setState({ pending: null })
      return { imported: { entries: 2, wants: 0 }, skipped: [] }
    })
    render(<ImportLocalOffer />)

    expect(screen.getByRole('region', { name: 'Importar carpeta local' })).toHaveTextContent('2 cartas')
    fireEvent.click(screen.getByRole('button', { name: 'Importar' }))

    expect(importLocalBinder).toHaveBeenCalledTimes(1)
    await vi.waitFor(() => expect(screen.queryByRole('region')).not.toBeInTheDocument())
  })

  it('hides the offer when the user declines', () => {
    useImportOfferStore.setState({ pending: { entries: [entry], wants: [] } })
    render(<ImportLocalOffer />)
    fireEvent.click(screen.getByRole('button', { name: 'Ahora no' }))
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
    expect(importLocalBinder).not.toHaveBeenCalled()
  })
})
