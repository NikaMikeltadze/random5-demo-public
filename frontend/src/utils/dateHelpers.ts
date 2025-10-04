import { getDayOfYear, parse, format } from 'date-fns';

/**
 * Convert a date string (MM-DD) or Date object to day of year (1-366)
 */
export function dateToDayOfYear(date: string | Date): number {
  if (typeof date === 'string') {
    // Parse MM-DD format with a leap year to support Feb 29
    const parsedDate = parse(`2024-${date}`, 'yyyy-MM-dd', new Date());
    return getDayOfYear(parsedDate);
  }
  return getDayOfYear(date);
}

/**
 * Convert day of year (1-366) to MM-DD string
 */
export function dayOfYearToDate(dayOfYear: number): string {
  // Use 2024 (leap year) as base year to support all 366 days
  const date = new Date(2024, 0, dayOfYear);
  return format(date, 'MM-dd');
}

/**
 * Format a date for display
 */
export function formatDateForDisplay(date: Date): string {
  return format(date, 'MMMM d');
}

/**
 * Get month and day from MM-DD string
 */
export function parseMonthDay(dateStr: string): { month: number; day: number } {
  const [month, day] = dateStr.split('-').map(Number);
  return { month, day };
}

/**
 * Create a date string in YYYY-MM-DD format for HTML date input
 */
export function toDateInputValue(dateStr: string): string {
  return `2024-${dateStr}`;
}

/**
 * Extract MM-DD from HTML date input value
 */
export function fromDateInputValue(inputValue: string): string {
  const parts = inputValue.split('-');
  return `${parts[1]}-${parts[2]}`;
}
