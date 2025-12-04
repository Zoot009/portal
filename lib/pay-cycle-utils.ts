/**
 * Utility functions for handling pay cycle dates (6th to 5th cycle)
 */

/**
 * Get the current pay cycle start and end dates
 * Pay cycle runs from 6th of one month to 5th of next month
 * @param referenceDate - Optional reference date (defaults to today)
 * @returns Object with start and end dates of the current pay cycle
 */
export function getCurrentPayCycle(referenceDate: Date = new Date()) {
  const year = referenceDate.getFullYear()
  const month = referenceDate.getMonth() // 0-indexed
  const day = referenceDate.getDate()

  let startYear = year
  let startMonth = month
  let endYear = year
  let endMonth = month + 1

  // If today is before 6th, we're in previous month's pay cycle
  if (day < 6) {
    startMonth = month - 1
    endMonth = month
  }

  // Handle year boundaries
  if (startMonth < 0) {
    startMonth = 11
    startYear = year - 1
  }
  if (endMonth > 11) {
    endMonth = 0
    endYear = year + 1
  }

  const startDate = new Date(startYear, startMonth, 6)
  const endDate = new Date(endYear, endMonth, 5)

  return {
    start: startDate,
    end: endDate
  }
}

/**
 * Get pay cycle for a specific month offset from current
 * @param monthsOffset - Number of months to offset (negative for previous months)
 * @param referenceDate - Optional reference date (defaults to today)
 * @returns Object with start and end dates of the specified pay cycle
 */
export function getPayCycleByOffset(monthsOffset: number, referenceDate: Date = new Date()) {
  const offsetDate = new Date(referenceDate)
  offsetDate.setMonth(offsetDate.getMonth() + monthsOffset)
  return getCurrentPayCycle(offsetDate)
}

/**
 * Format pay cycle period as a readable string
 * @param startDate - Start date of pay cycle
 * @param endDate - End date of pay cycle
 * @returns Formatted string like "Dec 6, 2024 - Jan 5, 2025"
 */
export function formatPayCyclePeriod(startDate: Date, endDate: Date): string {
  const options: Intl.DateTimeFormatOptions = { 
    month: 'short', 
    day: 'numeric',
    year: startDate.getFullYear() !== endDate.getFullYear() ? 'numeric' : undefined
  }
  
  const startStr = startDate.toLocaleDateString('en-US', options)
  const endStr = endDate.toLocaleDateString('en-US', options)
  
  return `${startStr} - ${endStr}`
}

/**
 * Check if a date falls within a pay cycle
 * @param date - Date to check
 * @param cycleStart - Start of pay cycle
 * @param cycleEnd - End of pay cycle
 * @returns True if date is within the pay cycle
 */
export function isDateInPayCycle(date: Date, cycleStart: Date, cycleEnd: Date): boolean {
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const startOnly = new Date(cycleStart.getFullYear(), cycleStart.getMonth(), cycleStart.getDate())
  const endOnly = new Date(cycleEnd.getFullYear(), cycleEnd.getMonth(), cycleEnd.getDate())
  
  return dateOnly >= startOnly && dateOnly <= endOnly
}

/**
 * Get all dates within a pay cycle
 * @param cycleStart - Start of pay cycle
 * @param cycleEnd - End of pay cycle
 * @returns Array of date strings in YYYY-MM-DD format
 */
export function getPayCycleDateStrings(cycleStart: Date, cycleEnd: Date): string[] {
  const dates: string[] = []
  const currentDate = new Date(cycleStart)
  
  while (currentDate <= cycleEnd) {
    dates.push(currentDate.toISOString().split('T')[0])
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  return dates
}