export const validName = name => typeof name === 'string' && /^[A-Za-z0-9_]{3,12}$/.test(name)

export function validEntry(entry) {
  return entry && validName(entry.name) && Number.isSafeInteger(entry.score) && entry.score >= 0 &&
    Number.isInteger(entry.nights_won) && entry.nights_won >= 0 && entry.nights_won <= 3 &&
    typeof entry.achieved_at === 'string' && /^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(entry.achieved_at) &&
    Number.isFinite(Date.parse(entry.achieved_at)) && Number.isSafeInteger(entry.seed)
}
export const rank = entries => entries.filter(validEntry)
  .sort((a, b) => b.score - a.score || Date.parse(a.achieved_at) - Date.parse(b.achieved_at))
  .slice(0, 10)
