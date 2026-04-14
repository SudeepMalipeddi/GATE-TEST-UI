/**
 * Returns true if userAnswer is correct for a NAT question.
 * correctAnswer may be a plain value ("3") or a range ("2.5:3.5"),
 * where the user's value must satisfy min ≤ value ≤ max.
 */
export function natCorrect(
  userAnswer: string | string[] | undefined,
  correctAnswer: string | string[],
): boolean {
  const userStr = String(userAnswer ?? '').trim()
  const correctStr = String(correctAnswer ?? '').trim()
  if (!correctStr) return false
  if (correctStr.includes(':')) {
    const [minStr, maxStr] = correctStr.split(':')
    const userNum = parseFloat(userStr)
    const minNum = parseFloat(minStr)
    const maxNum = parseFloat(maxStr)
    if (!isNaN(userNum) && !isNaN(minNum) && !isNaN(maxNum)) {
      return userNum >= minNum && userNum <= maxNum
    }
  }
  return userStr === correctStr
}
