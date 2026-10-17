import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import WantsPage from '@/features/wants/components/WantsPage'
import { useBinderStore } from '@/features/binder/state/binderStore'
import { offersPort } from '@/shared/api/offersPort'
import type { WantEntry } from '@/shared/types/mtg'

vi.mock('@/shared/api/offersPort', () => ({
  offersPort: { offersOf: vi.fn(async () => []) },
}))

const offersOf = offersPort.offersOf as ReturnType<typeof vi.fn>

function renderPage() {
  const client = new QueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return render(<WantsPage />, { wrapper })
}

function seedWant(overrides: Partial<WantEntry> = {}): WantEntry {
  const want: WantEntry = {
    id: 'w1',
    oracleId: 'oracle-bolt',
    name: 'Lightning Bolt',
    typeLine: 'Instant',
    imageNormal: 'https://img.example/bolt.jpg',
    quantity: 2,
    priority: 'normal',
    ...overrides,
  }
  useBinderStore.setState({ wants: [want] })
  return want
}

describe('WantsPage', () => {
  beforeEach(() => {
    useBinderStore.setState({ wants: [] })
    offersOf.mockReset()
    offersOf.mockResolvedValue([])
  })

  it('shows the search form without a toggle button', () => {
    renderPage()

    expect(screen.getByPlaceholderText('Buscar carta...')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Agregar deseo' }),
    ).not.toBeInTheDocument()
  })

  it('renders each want as a card with thumbnail, name, type and quantity', () => {
    const want: WantEntry = {
      id: 'w1',
      oracleId: 'oracle-bolt',
      name: 'Lightning Bolt',
      typeLine: 'Instant',
      imageNormal: 'https://img.example/bolt.jpg',
      quantity: 2,
      priority: 'normal',
    }
    useBinderStore.setState({ wants: [want] })

    renderPage()

    expect(screen.getByText('Lightning Bolt')).toBeInTheDocument()
    expect(screen.getByText('Instant')).toBeInTheDocument()
    expect(screen.getByText('Cantidad: 2')).toBeInTheDocument()
    const thumb = document.querySelector('.want-item-thumb')
    expect(thumb).toHaveAttribute('src', 'https://img.example/bolt.jpg')
    expect(
      screen.queryByText('Oráculo:'),
    ).not.toBeInTheDocument()
  })

  it('falls back to the oracle id for wants stored without a snapshot', () => {
    const legacy: WantEntry = {
      id: 'w2',
      oracleId: 'oracle-legacy',
      quantity: 1,
      priority: 'normal',
    }
    useBinderStore.setState({ wants: [legacy] })

    renderPage()

    expect(screen.getByText('oracle-legacy')).toBeInTheDocument()
    expect(document.querySelector('.want-item-thumb')).toBeNull()
  })

  it('shows the printing label of a want with a preferred printing', () => {
    seedWant({
      preferredPrintingId: 'pr-9',
      printingLabel: 'Limited Edition Alpha #161',
    })

    renderPage()

    expect(screen.getByText('Limited Edition Alpha #161')).toBeInTheDocument()
    expect(screen.queryByText('pr-9')).not.toBeInTheDocument()
  })

  it('shows "Cualquier impresión" for an oracle-level want', () => {
    seedWant({
      name: 'Lightning Bolt',
      oracleId: 'oracle-bolt',
      typeLine: 'Instant',
      imageNormal: 'https://img.example/bolt.jpg',
      quantity: 1,
      priority: 'normal',
    })

    renderPage()

    expect(screen.getByText('Cualquier impresión')).toBeInTheDocument()
    const printing = screen.getByText('Cualquier impresión').closest('.want-item-printing')
    expect(printing).toHaveClass('want-item-printing--oracle')
  })

  it('shows a compact "La tienen" stack when the offers port reports owners', async () => {
    offersOf.mockResolvedValue([
      { id: 'u1', displayName: 'Ana', offersCopies: 2 },
      { id: 'u2', displayName: 'Bruno', offersCopies: 1 },
    ])
    seedWant()

    renderPage()

    expect(await screen.findByText('2 la tienen')).toBeInTheDocument()
  })

  it('renders no "La tienen" row while the offers port reports nobody', async () => {
    seedWant()

    renderPage()

    // The local port resolves empty; the compact row must add nothing, so a
    // want without owners keeps its original one-line shape.
    await waitFor(() => expect(offersOf).toHaveBeenCalled())
    expect(document.querySelector('.want-item-owners')).toBeNull()
  })

  it('asks the offers port for each want card identity', async () => {
    seedWant({ oracleId: 'oracle-bolt' })

    renderPage()

    await waitFor(() =>
      expect(offersOf).toHaveBeenCalledWith('oracle-bolt', expect.anything()),
    )
  })

  it('shows the empty state when there are no wants', () => {
    renderPage()

    expect(screen.getByText(/Sin deseos todavía/)).toBeInTheDocument()
  })

  describe('remove confirmation', () => {
    async function openConfirm(label: string) {
      fireEvent.click(screen.getByRole('button', { name: label }))
      return screen.findByRole('dialog')
    }

    it('opens a confirmation dialog from the card remove button', async () => {
      seedWant()
      renderPage()

      const dialog = await openConfirm('Retirar Lightning Bolt')

      expect(
        within(dialog).getByText(
          'Seguro quieres retirar Lightning Bolt de tu lista de Deseos?',
        ),
      ).toBeInTheDocument()
      expect(
        within(dialog).getByRole('button', { name: 'Confirmar' }),
      ).toBeInTheDocument()
      expect(
        within(dialog).getByRole('button', { name: 'Rechazar' }),
      ).toBeInTheDocument()
    })

    it('keeps the want when the dialog is rejected', async () => {
      seedWant()
      renderPage()
      const dialog = await openConfirm('Retirar Lightning Bolt')

      fireEvent.click(within(dialog).getByRole('button', { name: 'Rechazar' }))
      await waitFor(() =>
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
      )

      expect(screen.getByText('Lightning Bolt')).toBeInTheDocument()
      expect(useBinderStore.getState().wants).toHaveLength(1)
    })

    it('removes the want when the dialog is confirmed', async () => {
      seedWant()
      renderPage()
      const dialog = await openConfirm('Retirar Lightning Bolt')

      fireEvent.click(
        within(dialog).getByRole('button', { name: 'Confirmar' }),
      )
      await waitFor(() =>
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
      )

      expect(useBinderStore.getState().wants).toHaveLength(0)
      expect(screen.queryByText('Lightning Bolt')).not.toBeInTheDocument()
      expect(screen.getByText(/Sin deseos todavía/)).toBeInTheDocument()
    })

    it('closes the dialog on Escape and on overlay click without removing', async () => {
      seedWant()
      renderPage()
      const dialog = await openConfirm('Retirar Lightning Bolt')

      fireEvent.keyDown(dialog, { key: 'Escape' })
      await waitFor(() =>
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
      )

      const reopened = await openConfirm('Retirar Lightning Bolt')
      fireEvent.click(reopened.parentElement as HTMLElement)
      await waitFor(() =>
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
      )

      expect(useBinderStore.getState().wants).toHaveLength(1)
    })

    it('uses the oracle id for wants stored without a snapshot', async () => {
      seedWant({
        name: undefined,
        typeLine: undefined,
        imageNormal: undefined,
        oracleId: 'oracle-legacy',
      })
      renderPage()

      const dialog = await openConfirm('Retirar oracle-legacy')

      expect(
        within(dialog).getByText(
          'Seguro quieres retirar oracle-legacy de tu lista de Deseos?',
        ),
      ).toBeInTheDocument()
    })
  })
})
