import { describe, it, expect, beforeEach } from 'vitest'
import { useBinderStore } from '@/features/binder/state/binderStore'
import type { BinderEntry } from '@/shared/types/mtg'

function makeEntry(overrides: Partial<BinderEntry> = {}): BinderEntry {
  return {
    id: 'e1',
    printingId: 'p1',
    quantity: 1,
    condition: 'NM',
    language: 'en',
    forTrade: true,
    ...overrides,
  }
}

beforeEach(() => {
  useBinderStore.setState({ entries: [], wants: [] })
})

describe('updateEntryDetails', () => {
  it('patches only the provided fields on the matching entry', () => {
    useBinderStore.setState({
      entries: [makeEntry({ finish: 'nonfoil', notes: 'old note' })],
    })

    useBinderStore.getState().updateEntryDetails('e1', { finish: 'foil' })

    const entry = useBinderStore.getState().entries[0]
    expect(entry.finish).toBe('foil')
    expect(entry.notes).toBe('old note')
  })

  it('leaves other entries untouched', () => {
    useBinderStore.setState({
      entries: [makeEntry({ id: 'e1' }), makeEntry({ id: 'e2', notes: 'keep' })],
    })

    useBinderStore.getState().updateEntryDetails('e1', { notes: 'changed' })

    const entries = useBinderStore.getState().entries
    expect(entries[0].notes).toBe('changed')
    expect(entries[1].notes).toBe('keep')
  })

  it('can undeclare a finish by patching it back to undefined', () => {
    useBinderStore.setState({ entries: [makeEntry({ finish: 'foil' })] })

    useBinderStore.getState().updateEntryDetails('e1', { finish: undefined })

    expect(useBinderStore.getState().entries[0].finish).toBeUndefined()
  })
})
