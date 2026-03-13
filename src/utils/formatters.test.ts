import { describe, it, expect } from 'vitest'
import { formatCurrency, formatPercent, formatNumber, addMonths, formatMonthYear, formatDate, monthsBetween } from './formatters'

describe('formatCurrency', () => {
  it('should format COP currency', () => {
    const result = formatCurrency(1500000)
    expect(result).toContain('1.500.000') // es-CO format
  })

  it('should handle zero', () => {
    const result = formatCurrency(0)
    expect(result).toContain('0')
  })

  it('should handle negative amounts', () => {
    const result = formatCurrency(-500000)
    expect(result).toContain('500.000')
  })
})

describe('formatPercent', () => {
  it('should format as percentage', () => {
    expect(formatPercent(0.5)).toBe('50.0%')
  })

  it('should respect decimal places', () => {
    expect(formatPercent(0.1234, 2)).toBe('12.34%')
  })

  it('should handle zero', () => {
    expect(formatPercent(0)).toBe('0.0%')
  })

  it('should handle values over 100%', () => {
    expect(formatPercent(1.5)).toBe('150.0%')
  })
})

describe('formatNumber', () => {
  it('should format with locale separators', () => {
    const result = formatNumber(1500000)
    expect(result).toContain('1.500.000')
  })
})

describe('addMonths', () => {
  it('should add months correctly', () => {
    const date = new Date('2026-01-15')
    const result = addMonths(date, 3)
    expect(result.getMonth()).toBe(3) // April (0-indexed)
    expect(result.getFullYear()).toBe(2026)
  })

  it('should handle year overflow', () => {
    const date = new Date('2026-10-15')
    const result = addMonths(date, 3)
    expect(result.getFullYear()).toBe(2027)
    expect(result.getMonth()).toBe(0) // January (Oct is month 9, 9+3=12, wraps to month index 0)
  })

  it('should handle zero months', () => {
    const date = new Date('2026-06-15')
    const result = addMonths(date, 0)
    expect(result.getMonth()).toBe(5) // June
  })

  it('should not mutate original date', () => {
    const date = new Date('2026-01-15')
    const originalMonth = date.getMonth()
    addMonths(date, 5)
    expect(date.getMonth()).toBe(originalMonth)
  })
})

describe('formatMonthYear', () => {
  it('should return a string with month and year', () => {
    const date = new Date('2026-03-15')
    const result = formatMonthYear(date)
    expect(result).toBeTruthy()
    expect(result.length).toBeGreaterThan(3)
  })
})

describe('formatDate', () => {
  it('should format date string', () => {
    const result = formatDate('2026-03-15')
    expect(result).toBeTruthy()
    expect(result.length).toBeGreaterThan(5)
  })
})

describe('monthsBetween', () => {
  it('should calculate months between dates', () => {
    const from = new Date('2026-01-01')
    const to = new Date('2026-07-01')
    expect(monthsBetween(from, to)).toBe(6)
  })

  it('should handle same month', () => {
    const date = new Date('2026-03-15')
    expect(monthsBetween(date, date)).toBe(0)
  })

  it('should handle year boundaries', () => {
    const from = new Date('2025-10-01')
    const to = new Date('2026-03-01')
    expect(monthsBetween(from, to)).toBe(5)
  })

  it('should return negative for reversed dates', () => {
    const from = new Date('2026-06-01')
    const to = new Date('2026-01-01')
    expect(monthsBetween(from, to)).toBe(-5)
  })
})
