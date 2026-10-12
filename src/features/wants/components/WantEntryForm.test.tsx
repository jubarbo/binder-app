import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import WantEntryForm from './WantEntryForm'

const { addWantMock } = vi.hoisted(() => ({ addWantMock: vi.fn() }))

vi.mock('../../binder/state/binderStore', () => ({
  useBinderStore: (selector: any) => selector({ addWant: addWantMock }),
}))

describe('WantEntryForm', () => {
  beforeEach(() => {
    addWantMock.mockClear()
  })

  it('submits a want with priority "normal"', async () => {
    render(<WantEntryForm />)

    fireEvent.change(screen.getByPlaceholderText('Oracle ID'), {
      target: { value: 'oracle-id-123' },
    })
    fireEvent.click(screen.getByText('Agregar want'))

    await waitFor(() => expect(addWantMock).toHaveBeenCalled())
    expect(addWantMock).toHaveBeenCalledWith(
      expect.objectContaining({ priority: 'normal' }),
    )
  })
})