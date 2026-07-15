import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const apiMock = {
  getMe: vi.fn(),
  getAuthStatus: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn()
}

vi.mock('../src/api.js', () => ({
  api: apiMock,
  setUnauthorizedHandler: vi.fn()
}))

const { default: router } = await import('../src/router.js')

beforeEach(() => {
  setActivePinia(createPinia())
  Object.values(apiMock).forEach((fn) => fn.mockReset())
})

describe('router auth guard', () => {
  it('sends an unauthenticated visitor to the home route to /login', async () => {
    apiMock.getMe.mockRejectedValue(new Error('not authenticated'))
    await router.push('/')
    expect(router.currentRoute.value.path).toBe('/login')
  })

  it('preserves the intended destination as a redirect query param', async () => {
    apiMock.getMe.mockRejectedValue(new Error('not authenticated'))
    await router.push('/settings')
    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query.redirect).toBe('/settings')
  })

  it('lets an authenticated visitor through to a protected route', async () => {
    apiMock.getMe.mockResolvedValue({ id: 1, username: 'admin', role: 'admin' })
    await router.push('/')
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('lets an unauthenticated visitor reach /login directly', async () => {
    apiMock.getMe.mockRejectedValue(new Error('not authenticated'))
    await router.push('/login')
    expect(router.currentRoute.value.path).toBe('/login')
  })

  it('bounces an already-authenticated user away from /login', async () => {
    apiMock.getMe.mockResolvedValue({ id: 1, username: 'admin', role: 'admin' })
    await router.push('/login')
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('bounces an already-authenticated user away from /register', async () => {
    apiMock.getMe.mockResolvedValue({ id: 1, username: 'admin', role: 'admin' })
    await router.push('/register')
    expect(router.currentRoute.value.path).toBe('/')
  })
})
