import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TradeProposalPanel from '@/features/trades/components/TradeProposalPanel'
import { TradesUnavailableError } from '@/shared/api/tradesPort'
import type { BinderEntry, WantEntry } from '@/shared/types/mtg'

vi.mock('@/features/catalog/catalogQueries', () => ({
  usePrinting: vi.fn(),
}))

const { stateMock } = vi.hoisted(() => ({
  stateMock: {
    entries: [] as BinderEntry[],
    wants: [] as WantEntry[],
  },
}))

vi.mock('@/features/binder/state/binderStore', () => ({
  useBinderStore: (selector: (state: typeof stateMock) => unknown) =>
    selector(stateMock),
}))

vi.mock('@/shared/api/tradesPort', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api/tradesPort')>()),
  tradesPort: {
    proposeTrade: vi.fn(),
    myTradePairs: vi.fn(),
    respondTrade: vi.fn(),
  },
}))

// The toast container lives in AppLayout, which the panel test does not render;
// assert the notification call instead of the rendered toast.
vi.mock('react-toastify', () => ({
  toast: { success: vi.fn() },
}))

import { usePrinting } from '@/features/catalog/catalogQueries'
import { tradesPort } from '@/shared/api/tradesPort'
import { toast } from 'react-toastify'

const mockUsePrinting = usePrinting as unknown as ReturnType<typeof vi.fn>
const mockPropose = tradesPort.proposeTrade as unknown as ReturnType<typeof vi.fn>

const counterpart = { id: 'u-ana', displayName: 'Ana' }

function makeEntry(id: string, overrides: Partial<BinderEntry> = {}): BinderEntry {
  return {
    id,
    printingId: `p-${id}`,
    quantity: 1,
    condition: 'NM',
    language: 'en',
    forTrade: true,
    ...overrides,
  }
}

function makeWant(id: string, name: string, oracleId: string): WantEntry {
  return { id, oracleId, name, quantity: 1, priority: 'normal' }
}

describe('TradeProposalPanel', () => {
  let onClose: () => void

  function renderPanel(
    props: Partial<Parameters<typeof TradeProposalPanel>[0]> = {},
  ) {
    return render(
      <TradeProposalPanel
        counterpart={counterpart}
        onClose={onClose}
        {...props}
      />,
    )
  }

  beforeEach(() => {
    onClose = vi.fn<() => void>()
    stateMock.entries = []
    stateMock.wants = []
    mockPropose.mockReset()
    mockUsePrinting.mockReset()
    mockUsePrinting.mockImplementation((id: string) => ({
      data: { name: `Name of ${id}`, imageSmall: 'http://example.com/s.png' },
      isPending: false,
      isError: false,
    }))
    vi.mocked(toast.success).mockReset()
  })

  it('offers my for-trade entries in the give column and my wants in the ask column', () => {
    stateMock.entries = [
      makeEntry('e1'),
      makeEntry('e2', { forTrade: false }),
    ]
    stateMock.wants = [makeWant('w1', 'Sol Ring', 'o-sol')]

    renderPanel()

    expect(screen.getByRole('checkbox', { name: /Name of p-e1/ })).toBeInTheDocument()
    // A copy I never flagged for trade is not an offer I can compose here.
    expect(screen.queryByRole('checkbox', { name: /Name of p-e2/ })).not.toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /Sol Ring/ })).toBeInTheDocument()
  })

  it('pre-selects the give column with the matched entry at the WhoWants entry point', () => {
    stateMock.entries = [makeEntry('e1'), makeEntry('e2')]
    stateMock.wants = [makeWant('w1', 'Sol Ring', 'o-sol')]

    renderPanel({ prefillGiveEntryId: 'e1' })

    expect(screen.getByRole('checkbox', { name: /Name of p-e1/ })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /Name of p-e2/ })).not.toBeChecked()
  })

  it('pre-selects the ask column with the matched card at the WhoHas entry point', () => {
    stateMock.entries = [makeEntry('e1')]
    stateMock.wants = [makeWant('w1', 'Sol Ring', 'o-sol'), makeWant('w2', 'Lightning Bolt', 'o-bolt')]

    renderPanel({ prefillAskOracleId: 'o-sol' })

    expect(screen.getByRole('checkbox', { name: /Sol Ring/ })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /Lightning Bolt/ })).not.toBeChecked()
  })

  it('blocks submission while either side is empty', () => {
    stateMock.entries = [makeEntry('e1')]
    stateMock.wants = [makeWant('w1', 'Sol Ring', 'o-sol')]

    renderPanel()

    const submit = screen.getByRole('button', { name: 'Proponer' })
    expect(submit).toBeDisabled()

    fireEvent.click(screen.getByRole('checkbox', { name: /Name of p-e1/ }))
    expect(submit).toBeDisabled()

    fireEvent.click(screen.getByRole('checkbox', { name: /Sol Ring/ }))
    expect(submit).toBeEnabled()
  })

  it('tells me when nothing of mine is flagged for trade', () => {
    stateMock.wants = [makeWant('w1', 'Sol Ring', 'o-sol')]

    renderPanel()

    expect(
      screen.getByText('No tenés cartas marcadas para intercambio.'),
    ).toBeInTheDocument()
  })

  it('proposes the selected composition and closes on success', async () => {
    stateMock.entries = [makeEntry('e1')]
    stateMock.wants = [makeWant('w1', 'Sol Ring', 'o-sol')]
    mockPropose.mockResolvedValue({ id: 'pair-1', state: 'pending' })

    renderPanel({ prefillGiveEntryId: 'e1', prefillAskOracleId: 'o-sol' })
    fireEvent.click(screen.getByRole('button', { name: 'Proponer' }))

    await screen.findByText('Proponer')
    expect(mockPropose).toHaveBeenCalledWith({
      counterpartId: 'u-ana',
      give: [{ printingId: 'e1', quantity: 1 }],
      ask: [{ oracleId: 'o-sol', quantity: 1 }],
    })
    expect(vi.mocked(toast.success)).toHaveBeenCalledWith('Propuesta enviada a Ana')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('keeps the composition and shows an honest error when the proposal fails', async () => {
    stateMock.entries = [makeEntry('e1')]
    stateMock.wants = [makeWant('w1', 'Sol Ring', 'o-sol')]
    mockPropose.mockRejectedValue(new TradesUnavailableError())

    renderPanel({ prefillGiveEntryId: 'e1', prefillAskOracleId: 'o-sol' })
    fireEvent.click(screen.getByRole('button', { name: 'Proponer' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('necesita un backend conectado')
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('checkbox', { name: /Name of p-e1/ })).toBeChecked()
    expect(screen.getByRole('button', { name: 'Proponer' })).toBeEnabled()
    expect(vi.mocked(toast.success)).not.toHaveBeenCalled()
  })

  it('closes on Escape like the other overlays', () => {
    stateMock.wants = [makeWant('w1', 'Sol Ring', 'o-sol')]

    renderPanel()

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
