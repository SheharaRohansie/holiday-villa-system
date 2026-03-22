import React, { useEffect, useMemo, useState } from 'react';
import DatePicker from 'react-datepicker';
import type { BookedDateRange } from '../types';

import 'react-datepicker/dist/react-datepicker.css';
import '../styles/BookingCalendar.css';

type BookingCalendarProps = {
  bookedRanges: BookedDateRange[];
  startDate: Date | null;
  endDate: Date | null;
  onChange: (start: Date | null, end: Date | null) => void;
  disabled?: boolean;
};

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const parseIsoDateLocal = (iso: string): Date => new Date(`${iso}T00:00:00`);

const addDays = (d: Date, days: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
};

const dateKey = (d: Date) => {
  const x = startOfDay(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

const expandBookedDates = (ranges: BookedDateRange[]): Set<string> => {
  const booked = new Set<string>();
  for (const r of ranges) {
    const start = parseIsoDateLocal(r.checkInDate);
    const end = parseIsoDateLocal(r.checkOutDate);
    // Hotel semantics: check-out date is available again (treat end as exclusive)
    for (let d = startOfDay(start); d < startOfDay(end); d = startOfDay(addDays(d, 1))) {
      booked.add(dateKey(d));
    }
  }
  return booked;
};

const rangeOverlapsBooked = (booked: Set<string>, start: Date, end: Date): boolean => {
  for (let d = startOfDay(start); d < startOfDay(end); d = startOfDay(addDays(d, 1))) {
    if (booked.has(dateKey(d))) return true;
  }
  return false;
};

const BookingCalendar: React.FC<BookingCalendarProps> = ({
  bookedRanges,
  startDate,
  endDate,
  onChange,
  disabled = false,
}) => {
  const bookedSet = useMemo(() => expandBookedDates(bookedRanges), [bookedRanges]);
  const [selectionError, setSelectionError] = useState('');

  useEffect(() => {
    // Clear error if caller clears selection
    if (!startDate && !endDate) setSelectionError('');
  }, [startDate, endDate]);

  const isBooked = (d: Date) => bookedSet.has(dateKey(d));

  return (
    <div className="booking-calendar">
      <DatePicker
        inline
        selectsRange
        startDate={startDate}
        endDate={endDate}
        onChange={(dates: [Date | null, Date | null] | null) => {
          const [start, end] = (dates ?? [null, null]);

          // If selecting only the start date, accept immediately.
          if (start && !end) {
            setSelectionError('');
            onChange(start, null);
            return;
          }

          // If range complete, validate against booked dates.
          if (start && end) {
            if (rangeOverlapsBooked(bookedSet, start, end)) {
              setSelectionError('Selected dates overlap an existing booking. Please choose different dates.');
              // Keep the start date, force user to pick a different end date.
              onChange(start, null);
              return;
            }
            setSelectionError('');
            onChange(start, end);
            return;
          }

          // cleared
          setSelectionError('');
          onChange(null, null);
        }}
        minDate={startOfDay(new Date())}
        filterDate={(d: Date) => !isBooked(d)}
        dayClassName={(d: Date) => (isBooked(d) ? 'bc-day-booked' : '')}
        disabled={disabled}
      />

      <div className="booking-calendar-help">
        <div className="booking-calendar-legend">
          <span className="bc-legend-swatch" aria-hidden="true" />
          <span>Red dates are already booked</span>
        </div>
        {selectionError && <div className="booking-calendar-error">{selectionError}</div>}
      </div>
    </div>
  );
};

export default BookingCalendar;
