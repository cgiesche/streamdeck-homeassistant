import { describe, it, expect } from 'vitest'
import { trimBlankLabelLines } from './labelLines.js'

describe('trimBlankLabelLines (maxLines = 2)', () => {
  const trim = (lines) => trimBlankLabelLines(lines, 2)

  it('strips trailing blanks before leading, keeping text on the bottom row', () => {
    expect(trim(['', '', 'Text', ''])).toEqual(['', 'Text'])
  })

  it('leaves a leading blank that pushes text onto the bottom row', () => {
    expect(trim(['', 'Text'])).toEqual(['', 'Text'])
  })

  it('removes a lone trailing blank so text stays on the top row', () => {
    expect(trim(['Text', ''])).toEqual(['Text'])
  })

  it('collapses an all-blank input to empty', () => {
    expect(trim(['', '', ''])).toEqual([])
  })

  it('keeps leading blanks down to the floor, no further', () => {
    expect(trim(['', '', '', 'Text'])).toEqual(['', 'Text'])
  })

  it('preserves interior blanks between content', () => {
    expect(trim(['A', '', 'B'])).toEqual(['A', '', 'B'])
  })

  it('strips all trailing blanks regardless of count', () => {
    expect(trim(['Text', '', '', ''])).toEqual(['Text'])
  })

  it('leaves content-only input untouched', () => {
    expect(trim(['A', 'B'])).toEqual(['A', 'B'])
  })

  it('treats whitespace-only lines as blank', () => {
    expect(trim(['   ', '\t', 'Text', '  '])).toEqual(['\t', 'Text'])
  })

  it('does not mutate the input array', () => {
    const input = ['', 'Text', '']
    trim(input)
    expect(input).toEqual(['', 'Text', ''])
  })
})

describe('trimBlankLabelLines (other floors)', () => {
  it('respects a floor of 4 for leading blanks', () => {
    expect(trimBlankLabelLines(['', '', '', '', '', 'X'], 4)).toEqual(['', '', '', 'X'])
  })
})
