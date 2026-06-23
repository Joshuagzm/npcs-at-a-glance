import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getForgeUrl, setForgeUrl } from './settings'

beforeEach(() => localStorage.clear())
afterEach(() => localStorage.clear())

describe('forge url setting', () => {
  it('defaults to blank when nothing is stored', () => {
    expect(getForgeUrl()).toBe('')
  })

  it('persists and reads back a stored value', () => {
    setForgeUrl('http://127.0.0.1:7860')
    expect(getForgeUrl()).toBe('http://127.0.0.1:7860')
  })

  it('can be cleared back to blank', () => {
    setForgeUrl('http://127.0.0.1:7860')
    setForgeUrl('')
    expect(getForgeUrl()).toBe('')
  })
})
