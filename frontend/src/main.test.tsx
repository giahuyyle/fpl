import { beforeEach, describe, expect, it, vi } from 'vitest'


const render = vi.fn()
const createRoot = vi.fn(() => ({ render }))

vi.mock('react-dom/client', () => ({ createRoot }))


describe('application entry point', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>'
    vi.resetModules()
    createRoot.mockClear()
    render.mockClear()
  })

  it('mounts the React application into the root element', async () => {
    await import('./main')

    expect(createRoot).toHaveBeenCalledWith(document.getElementById('root'))
    expect(render).toHaveBeenCalledOnce()
  })
})
