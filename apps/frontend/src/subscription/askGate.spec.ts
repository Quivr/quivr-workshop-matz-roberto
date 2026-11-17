import { describe, expect, it, vi } from 'vitest'

import {
  applyPurchase,
  FREE,
  initialWallet,
  parseWallet,
  refillWallet,
  spendQuestion,
  type WalletState,
} from '../wallet'
import { askThroughGate } from './askGate'

/** A tiny stand-in for the provider: same spendQuestion, held in a variable. */
const fakeWallet = (start: WalletState = initialWallet()) => {
  let state = start
  const openPaywall = vi.fn()
  return {
    get state() {
      return state
    },
    buy: (id: Parameters<typeof applyPurchase>[1]) => {
      state = applyPurchase(state, id)
    },
    spend: () => {
      const next = spendQuestion(state)
      if (!next) {
        openPaywall('questions')
        return false
      }
      state = next
      return true
    },
    openPaywall,
  }
}

describe('question paywall', () => {
  it('lets exactly one question through for free', () => {
    expect(FREE.questions).toBe(1)
    const wallet = fakeWallet()
    const send = vi.fn()
    expect(askThroughGate(wallet.spend, send)).toBe(true)
    expect(send).toHaveBeenCalledTimes(1)
    expect(wallet.state.questions).toBe(0)
  })

  it('blocks the second question and opens the paywall without calling the agent', () => {
    const wallet = fakeWallet()
    const send = vi.fn()
    askThroughGate(wallet.spend, send)
    expect(askThroughGate(wallet.spend, send)).toBe(false)
    expect(askThroughGate(wallet.spend, send)).toBe(false)
    expect(send).toHaveBeenCalledTimes(1)
    expect(wallet.openPaywall).toHaveBeenCalledWith('questions')
    expect(wallet.openPaywall).toHaveBeenCalledTimes(2)
  })

  it('never goes below zero, so a blocked question costs nothing', () => {
    const spent = spendQuestion({ ...initialWallet(), questions: 0 })
    expect(spent).toBeUndefined()
  })

  it('unlocks unlimited questions after buying Quivr SaaS™', () => {
    const wallet = fakeWallet()
    const send = vi.fn()
    askThroughGate(wallet.spend, send)
    expect(askThroughGate(wallet.spend, send)).toBe(false)

    wallet.buy('quivr-saas')
    for (let index = 0; index < 5; index++)
      expect(askThroughGate(wallet.spend, send)).toBe(true)
    expect(send).toHaveBeenCalledTimes(6)
    expect(wallet.state.plus).toBe(true)
    expect(wallet.state.spentCoins).toBeGreaterThan(0)
  })

  it('also lets questions through with Gold or a 24h pass', () => {
    const used = { ...initialWallet(), questions: 0 }
    expect(spendQuestion(applyPurchase(used, 'gold'))).toBeDefined()
    expect(spendQuestion(applyPurchase(used, 'unlimited-day'))).toBeDefined()
    expect(spendQuestion(applyPurchase(used, 'see-all'))).toBeUndefined()
  })

  it('keeps the unlocked state when the wallet is saved and loaded again', () => {
    const bought = applyPurchase(initialWallet(), 'quivr-saas')
    const reloaded = parseWallet(JSON.stringify(bought))
    expect(reloaded.plus).toBe(true)
    expect(spendQuestion({ ...reloaded, questions: 0 })).toBeDefined()
  })

  it('keeps a used free question used across a reload', () => {
    const used = spendQuestion(initialWallet())
    if (!used) throw new Error('first question should pass')
    const reloaded = parseWallet(JSON.stringify(used))
    expect(spendQuestion(reloaded)).toBeUndefined()
  })

  it('gives old saved wallets without the new fields the defaults', () => {
    const { questions, plus, ...old } = initialWallet()
    void questions
    void plus
    const reloaded = parseWallet(JSON.stringify(old))
    expect(reloaded.questions).toBe(FREE.questions)
    expect(reloaded.plus).toBe(false)
    expect(parseWallet('not json').questions).toBe(FREE.questions)
    expect(parseWallet(null).plus).toBe(false)
  })

  it('the free top-up gives one more question', () => {
    const used = { ...initialWallet(), questions: 0 }
    expect(spendQuestion(refillWallet(used))).toBeDefined()
  })
})
