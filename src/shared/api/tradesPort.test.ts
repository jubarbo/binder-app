import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  localTradesPort,
  mockTradesPort,
  TradesUnavailableError,
} from '@/shared/api/tradesPort'
import type { TradeProposal } from '@/shared/api/tradesPort'

const proposal: TradeProposal = {
  counterpartId: 'u-ana',
  give: [{ printingId: 'p1', quantity: 1 }],
  ask: [{ oracleId: 'o1', quantity: 2 }],
}

describe('localTradesPort', () => {
  it('refuses to propose a trade without a backend', async () => {
    await expect(localTradesPort.proposeTrade(proposal)).rejects.toBeInstanceOf(
      TradesUnavailableError,
    )
  })

  it('reports no trade pairs without a backend', async () => {
    await expect(localTradesPort.myTradePairs()).resolves.toEqual([])
  })

  it('refuses to respond without a backend', async () => {
    await expect(localTradesPort.respondTrade('x', 'accept')).rejects.toBeInstanceOf(
      TradesUnavailableError,
    )
  })
})

describe('mockTradesPort', () => {
  it('round-trips a proposal: propose, list, respond', async () => {
    const pair = await mockTradesPort.proposeTrade(proposal)

    expect(pair.state).toBe('pending')
    expect(pair.counterpartId).toBe('u-ana')
    expect(pair.give).toEqual([{ printingId: 'p1', quantity: 1 }])
    expect(pair.ask).toEqual([{ oracleId: 'o1', quantity: 2 }])
    await expect(mockTradesPort.myTradePairs()).resolves.toEqual([pair])

    const answered = await mockTradesPort.respondTrade(pair.id, 'accept')
    expect(answered.state).toBe('accepted')
    await expect(mockTradesPort.myTradePairs()).resolves.toEqual([answered])
  })
})

describe('tradesPort binding', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('stays on the honest local port without the flag', async () => {
    vi.stubEnv('VITE_MOCK_WISHERS', undefined)
    vi.resetModules()
    const mod = await import('@/shared/api/tradesPort')
    expect(mod.tradesPort).toBe(mod.localTradesPort)
  })

  it('binds the mock in dev behind the explicit flag', async () => {
    vi.stubEnv('VITE_MOCK_WISHERS', '1')
    vi.resetModules()
    const mod = await import('@/shared/api/tradesPort')
    expect(mod.tradesPort).toBe(mod.mockTradesPort)
  })
})
