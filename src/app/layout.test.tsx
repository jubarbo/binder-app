import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppLayout } from '@/app/layout'
import { authPort } from '@/shared/api/authPort'

vi.mock('@/shared/api/authPort', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/api/authPort')>()
  return {
    ...actual,
    authPort: {
      available: false,
      session: vi.fn(),
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn(),
    },
  }
})

const mockedPort = vi.mocked(authPort)

describe('AppLayout', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('bootstraps the session once on mount', () => {
    // Deliberately never settles: the assertion targets the trigger itself,
    // and a settled bootstrap would update the store outside act() for no
    // benefit in this test.
    mockedPort.session.mockReturnValue(new Promise(() => {}))

    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>,
    )

    expect(mockedPort.session).toHaveBeenCalledTimes(1)
    expect(
      screen.getByRole('navigation', { name: 'Navegación principal' }),
    ).toBeInTheDocument()
  })
})
