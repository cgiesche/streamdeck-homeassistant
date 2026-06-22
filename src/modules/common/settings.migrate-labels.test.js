import { describe, it, expect } from 'vitest'
import { Settings } from './settings.js'

/** Minimal v5 settings carrying the given raw buttonLabels through migration. */
const parseV5Labels = (buttonLabels) =>
  Settings.parse({ version: 5, display: { buttonLabels } }).display.buttonLabels

describe('Settings.parse v5 buttonLabels migration', () => {
  it('strips trailing blanks before leading, keeping text on the bottom row', () => {
    expect(parseV5Labels('\n\nText\n')).toBe('\nText')
  })

  it('drops a lone trailing blank, keeping text on the top row', () => {
    expect(parseV5Labels('Text\n')).toBe('Text')
  })

  it('preserves a leading blank that positions text on the bottom row', () => {
    expect(parseV5Labels('\nText')).toBe('\nText')
  })

  it('collapses all-blank labels to empty', () => {
    expect(parseV5Labels('\n\n')).toBe('')
  })
})
