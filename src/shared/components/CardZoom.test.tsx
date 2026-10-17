import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import CardZoom from '@/shared/components/CardZoom'

// CardZoom portals into document.body, so query the whole document.
describe('CardZoom', () => {
  it('shows a single image when no back face is given', () => {
    render(<CardZoom src="http://example.com/front.png" alt="Test Set #123" onClose={vi.fn()} />)

    expect(document.querySelectorAll('.zoom-img')).toHaveLength(1)
    expect(screen.getByAltText('Test Set #123')).toHaveAttribute(
      'src',
      'http://example.com/front.png',
    )
  })

  it('shows both faces side by side when a back face is given', () => {
    render(
      <CardZoom
        src="http://example.com/front.png"
        srcBack="http://example.com/back.png"
        alt="Test Set #123"
        onClose={vi.fn()}
      />,
    )

    const imgs = document.querySelectorAll('.zoom-img')
    expect(imgs).toHaveLength(2)
    expect(imgs[0]).toHaveAttribute('src', 'http://example.com/front.png')
    expect(imgs[1]).toHaveAttribute('src', 'http://example.com/back.png')
    expect(screen.getByAltText('Test Set #123 (dorso)')).toBeInTheDocument()
  })
})
