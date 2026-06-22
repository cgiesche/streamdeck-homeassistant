/**
 * Removes blank label lines so text sits where the user's padding intends.
 *
 * Trailing blanks are stripped first (they only waste render slots), then
 * leading blanks are stripped down to `maxLines` — leaving enough leading
 * blanks to keep content pushed onto the lower rows when the user wanted that.
 *
 * @param {string[]} lines - label lines (already split on '\n')
 * @param {number} maxLines - floor for leading-blank removal
 * @returns {string[]} a new array; the input is not mutated
 */
export function trimBlankLabelLines(lines, maxLines) {
  const out = [...lines]
  while (out.length > 0 && out[out.length - 1].trim() === '') {
    out.pop()
  }
  while (out.length > maxLines && out[0].trim() === '') {
    out.shift()
  }
  return out
}
