import { format, subDays } from 'date-fns'

export function lastNDaysRange(n: number, offsetDays = 0) {
  const until = subDays(new Date(), offsetDays)
  const since = subDays(until, n - 1)
  return { since: format(since, 'yyyy-MM-dd'), until: format(until, 'yyyy-MM-dd') }
}

export function periodVsPriorPeriod(days = 7) {
  return {
    thisPeriod: lastNDaysRange(days, 0),
    lastPeriod: lastNDaysRange(days, days),
  }
}
