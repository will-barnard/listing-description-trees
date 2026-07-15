import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const apiMock = {
  getMe: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn()
}
let capturedHandler = null

vi.mock('../../src/api.js', () => ({
  api: apiMock,
  setUnauthorizedHandler: (fn) => {
    capturedHandler = fn
  }
}))

// Imported after the mock so the store picks up the mocked module.
const { useAuthStore } = await import('../../src/stores/auth.js')

beforeEach(() => {
  setActivePinia(createPinia())
  Object.values(apiMock).forEach((fn) => fn.mockReset())
  capturedHandler = null
})

describe('auth store', () => {
  it('starts unloaded with no user', () => {
    const auth = useAuthStore()
    expect(auth.user).toBeNull()
    expect(auth.loaded).toBe(false)
    expect(auth.isAdmin).toBe(false)
  })

  it('fetchUser loads the current session', async () => {
    apiMock.getMe.mockResolvedValue({ id: 1, username: 'admin', role: 'admin' })
    const auth = useAuthStore()
    await auth.fetchUser()
    expect(auth.user).toEqual({ id: 1, username: 'admin', role: 'admin' })
    expect(auth.loaded).toBe(true)
    expect(auth.isAdmin).toBe(true)
  })

  it('fetchUser clears user on failure without throwing', async () => {
    apiMock.getMe.mockRejectedValue(new Error('not authenticated'))
    const auth = useAuthStore()
    await auth.fetchUser()
    expect(auth.user).toBeNull()
    expect(auth.loaded).toBe(true)
  })

  it('login stores the returned user and clears sessionExpired', async () => {
    apiMock.login.mockResolvedValue({ user: { id: 2, username: 'jsmith', role: 'user' } })
    const auth = useAuthStore()
    auth.sessionExpired = true

    const result = await auth.login('jsmith', 'password123')

    expect(apiMock.login).toHaveBeenCalledWith({ identifier: 'jsmith', password: 'password123' })
    expect(auth.user.username).toBe('jsmith')
    expect(auth.isAdmin).toBe(false)
    expect(auth.sessionExpired).toBe(false)
    expect(result.username).toBe('jsmith')
  })

  it('register stores the returned (admin) user', async () => {
    apiMock.register.mockResolvedValue({ user: { id: 1, username: 'admin', role: 'admin' } })
    const auth = useAuthStore()

    await auth.register('admin@example.com', 'admin', 'password123')

    expect(apiMock.register).toHaveBeenCalledWith({
      email: 'admin@example.com',
      username: 'admin',
      password: 'password123'
    })
    expect(auth.user.role).toBe('admin')
    expect(auth.isAdmin).toBe(true)
  })

  it('logout clears local state even if the API call fails', async () => {
    apiMock.getMe.mockResolvedValue({ id: 1, username: 'admin', role: 'admin' })
    apiMock.logout.mockRejectedValue(new Error('network error'))
    const auth = useAuthStore()
    await auth.fetchUser()
    expect(auth.user).not.toBeNull()

    await auth.logout()

    expect(auth.user).toBeNull()
    expect(auth.loaded).toBe(true)
  })

  it('registers an unauthorized handler that clears the session', () => {
    const auth = useAuthStore()
    auth.user = { id: 1, username: 'admin', role: 'admin' }

    expect(capturedHandler).toBeTypeOf('function')
    capturedHandler('TOKEN_EXPIRED')

    expect(auth.user).toBeNull()
    expect(auth.sessionExpired).toBe(true)
  })

  it('unauthorized handler does not flag sessionExpired for a plain missing session', () => {
    const auth = useAuthStore()
    auth.user = { id: 1, username: 'admin', role: 'admin' }

    capturedHandler('NOT_AUTHENTICATED')

    expect(auth.user).toBeNull()
    expect(auth.sessionExpired).toBe(false)
  })
})
