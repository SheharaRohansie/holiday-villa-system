type YearMonthParts = {
  year: number;
  month: number;
};

const parseYearMonth = (yearMonth: string | null | undefined): YearMonthParts | null => {
  if (!yearMonth) return null;
  const match = yearMonth.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;

  return { year, month };
};

const daysInMonth = (year: number, month: number): number | null => {
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
  const days = new Date(year, month, 0).getDate();
  return Number.isFinite(days) && days > 0 ? days : null;
};

export const nightsFromOccupancy = (
  occupancyPct: number | null | undefined,
  yearMonth: string | null | undefined
): number | null => {
  if (!Number.isFinite(occupancyPct)) return null;
  const parsed = parseYearMonth(yearMonth);
  if (!parsed) return null;
  const totalDays = daysInMonth(parsed.year, parsed.month);
  if (!totalDays) return null;

  return Math.round((occupancyPct / 100) * totalDays);
};

export const nightsLow = (ciLow: number | null | undefined, yearMonth: string | null | undefined) =>
  nightsFromOccupancy(ciLow, yearMonth);

export const nightsHigh = (ciHigh: number | null | undefined, yearMonth: string | null | undefined) =>
  nightsFromOccupancy(ciHigh, yearMonth);
