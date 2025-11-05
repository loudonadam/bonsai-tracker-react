import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

const MONTH_LABELS = Array.from({ length: 12 }, (_, index) => {
  const formatter = new Intl.DateTimeFormat(undefined, {
    month: "long",
  });
  return formatter.format(new Date(2000, index, 1));
});

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const getDateKey = (date) => {
  const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return normalized.getTime();
};

const parseDate = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  if (typeof value !== "string") {
    return null;
  }

  const [yearPart, monthPart, dayPart] = value.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);

  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
};

const formatDateValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (date) => {
  const formatter = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return formatter.format(date);
};

const clampMonthYear = (year, month, minDate, maxDate) => {
  let nextYear = year;
  let nextMonth = month;

  if (minDate) {
    const minMonthStart = new Date(
      minDate.getFullYear(),
      minDate.getMonth(),
      1
    ).getTime();
    const candidateStart = new Date(year, month, 1).getTime();
    if (candidateStart < minMonthStart) {
      nextYear = minDate.getFullYear();
      nextMonth = minDate.getMonth();
    }
  }

  if (maxDate) {
    const maxMonthStart = new Date(
      maxDate.getFullYear(),
      maxDate.getMonth(),
      1
    ).getTime();
    const candidateStart = new Date(nextYear, nextMonth, 1).getTime();
    if (candidateStart > maxMonthStart) {
      nextYear = maxDate.getFullYear();
      nextMonth = maxDate.getMonth();
    }
  }

  return { year: nextYear, month: nextMonth };
};

const buildCalendar = (year, month) => {
  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingDays = firstDayOfMonth.getDay();

  const days = [];

  for (let offset = leadingDays; offset > 0; offset -= 1) {
    const date = new Date(year, month, 1 - offset);
    days.push({ date, currentMonth: false });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    days.push({ date, currentMonth: true });
  }

  const trailingSlots = (7 - (days.length % 7)) % 7;
  for (let index = 1; index <= trailingSlots; index += 1) {
    const date = new Date(year, month, daysInMonth + index);
    days.push({ date, currentMonth: false });
  }

  while (days.length < 42) {
    const last = days[days.length - 1].date;
    const next = new Date(
      last.getFullYear(),
      last.getMonth(),
      last.getDate() + 1
    );
    days.push({ date: next, currentMonth: false });
  }

  return days;
};

const DatePicker = forwardRef(
  (
    {
      value,
      onChange,
      name,
      id,
      className = "",
      placeholder = "Select a date",
      disabled = false,
      required = false,
      min,
      max,
      "aria-required": ariaRequired,
      onBlur,
      onFocus,
      ...rest
    },
    ref
  ) => {
    const hiddenInputRef = useRef(null);
    useImperativeHandle(ref, () => hiddenInputRef.current);

    const selectedDate = useMemo(() => parseDate(value), [value]);
    const minDate = useMemo(() => parseDate(min), [min]);
    const maxDate = useMemo(() => parseDate(max), [max]);

    const initialDate = selectedDate ?? new Date();
    const [displayYear, setDisplayYear] = useState(initialDate.getFullYear());
    const [displayMonth, setDisplayMonth] = useState(initialDate.getMonth());
    const [isOpen, setIsOpen] = useState(false);

    const containerRef = useRef(null);

    useEffect(() => {
      if (selectedDate) {
        setDisplayYear(selectedDate.getFullYear());
        setDisplayMonth(selectedDate.getMonth());
      }
    }, [selectedDate]);

    useEffect(() => {
      if (!isOpen) {
        return undefined;
      }

      const handleClickOutside = (event) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(event.target)
        ) {
          setIsOpen(false);
          if (onBlur) {
            onBlur(event);
          }
        }
      };

      const handleKeyDown = (event) => {
        if (event.key === "Escape") {
          setIsOpen(false);
          if (onBlur) {
            onBlur(event);
          }
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleKeyDown);
      };
    }, [isOpen, onBlur]);

    useEffect(() => {
      if (!isOpen) {
        return;
      }

      if (minDate) {
        const minStart = new Date(
          minDate.getFullYear(),
          minDate.getMonth(),
          1
        ).getTime();
        const displayStart = new Date(
          displayYear,
          displayMonth,
          1
        ).getTime();
        if (displayStart < minStart) {
          setDisplayYear(minDate.getFullYear());
          setDisplayMonth(minDate.getMonth());
        }
      }

      if (maxDate) {
        const maxStart = new Date(
          maxDate.getFullYear(),
          maxDate.getMonth(),
          1
        ).getTime();
        const displayStart = new Date(
          displayYear,
          displayMonth,
          1
        ).getTime();
        if (displayStart > maxStart) {
          setDisplayYear(maxDate.getFullYear());
          setDisplayMonth(maxDate.getMonth());
        }
      }
    }, [displayMonth, displayYear, isOpen, maxDate, minDate]);

    const toggleOpen = useCallback(
      (event) => {
        if (disabled) {
          return;
        }
        if (!isOpen && onFocus) {
          onFocus(event);
        }
        setIsOpen((prev) => !prev);
      },
      [disabled, isOpen, onFocus]
    );

    const goToPreviousMonth = () => {
      const candidateYear = displayMonth === 0 ? displayYear - 1 : displayYear;
      const candidateMonth = displayMonth === 0 ? 11 : displayMonth - 1;
      const candidateStart = new Date(candidateYear, candidateMonth, 1);
      if (minDate && candidateStart < new Date(minDate.getFullYear(), minDate.getMonth(), 1)) {
        return;
      }
      setDisplayYear(candidateYear);
      setDisplayMonth(candidateMonth);
    };

    const goToNextMonth = () => {
      const candidateYear = displayMonth === 11 ? displayYear + 1 : displayYear;
      const candidateMonth = displayMonth === 11 ? 0 : displayMonth + 1;
      const candidateStart = new Date(candidateYear, candidateMonth, 1);
      if (maxDate && candidateStart > new Date(maxDate.getFullYear(), maxDate.getMonth(), 1)) {
        return;
      }
      setDisplayYear(candidateYear);
      setDisplayMonth(candidateMonth);
    };

    const years = useMemo(() => {
      const today = new Date();
      const fallbackStart = today.getFullYear() - 60;
      const fallbackEnd = today.getFullYear() + 20;

      let start = minDate ? minDate.getFullYear() : fallbackStart;
      let end = maxDate ? maxDate.getFullYear() : fallbackEnd;

      if (selectedDate) {
        start = Math.min(start, selectedDate.getFullYear());
        end = Math.max(end, selectedDate.getFullYear());
      }

      if (start > end) {
        [start, end] = [end, start];
      }

      const values = [];
      for (let year = start; year <= end; year += 1) {
        values.push(year);
      }
      return values;
    }, [maxDate, minDate, selectedDate]);

    const calendarDays = useMemo(
      () => buildCalendar(displayYear, displayMonth),
      [displayMonth, displayYear]
    );

    const todayKey = useMemo(() => {
      const today = new Date();
      return getDateKey(today);
    }, []);

    const selectedKey = selectedDate ? getDateKey(selectedDate) : null;
    const minKey = minDate ? getDateKey(minDate) : null;
    const maxKey = maxDate ? getDateKey(maxDate) : null;

    const canGoPrev = useMemo(() => {
      if (!minDate) {
        return true;
      }
      const previousMonthStart = new Date(
        displayMonth === 0 ? displayYear - 1 : displayYear,
        displayMonth === 0 ? 11 : displayMonth - 1,
        1
      ).getTime();
      const minStart = new Date(
        minDate.getFullYear(),
        minDate.getMonth(),
        1
      ).getTime();
      return previousMonthStart >= minStart;
    }, [displayMonth, displayYear, minDate]);

    const canGoNext = useMemo(() => {
      if (!maxDate) {
        return true;
      }
      const nextMonthStart = new Date(
        displayMonth === 11 ? displayYear + 1 : displayYear,
        displayMonth === 11 ? 0 : displayMonth + 1,
        1
      ).getTime();
      const maxStart = new Date(
        maxDate.getFullYear(),
        maxDate.getMonth(),
        1
      ).getTime();
      return nextMonthStart <= maxStart;
    }, [displayMonth, displayYear, maxDate]);

    const handleSelectDay = (day) => {
      if (disabled) {
        return;
      }

      const dateKey = getDateKey(day.date);
      if ((minKey && dateKey < minKey) || (maxKey && dateKey > maxKey)) {
        return;
      }

      const formattedValue = formatDateValue(day.date);
      const syntheticEvent = {
        target: {
          value: formattedValue,
          name,
          id,
        },
      };
      if (onChange) {
        onChange(syntheticEvent);
      }
      setIsOpen(false);
      if (onBlur) {
        onBlur(syntheticEvent);
      }
    };

    const handleMonthChange = (event) => {
      const nextMonth = Number(event.target.value);
      if (Number.isNaN(nextMonth)) {
        return;
      }
      const clamped = clampMonthYear(displayYear, nextMonth, minDate, maxDate);
      setDisplayYear(clamped.year);
      setDisplayMonth(clamped.month);
    };

    const handleYearChange = (event) => {
      const nextYear = Number(event.target.value);
      if (Number.isNaN(nextYear)) {
        return;
      }
      const clamped = clampMonthYear(nextYear, displayMonth, minDate, maxDate);
      setDisplayYear(clamped.year);
      setDisplayMonth(clamped.month);
    };

    const buttonClasses = [
      "w-full flex items-center justify-between rounded-lg border border-gray-300 px-3 py-2 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent",
      disabled ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white text-gray-900 hover:border-green-500",
      !value ? "text-gray-500" : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className="relative" ref={containerRef}>
        <input
          type="hidden"
          name={name}
          id={id}
          value={value || ""}
          ref={hiddenInputRef}
          required={required}
        />
        <button
          type="button"
          className={buttonClasses}
          onClick={toggleOpen}
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-required={ariaRequired}
          {...rest}
        >
          <span>{selectedDate ? formatDisplayDate(selectedDate) : placeholder}</span>
          <CalendarDays className="h-4 w-4 text-gray-500" />
        </button>
        {isOpen && (
          <div className="absolute left-0 z-50 mt-2 w-72 rounded-lg border border-gray-200 bg-white shadow-xl" role="dialog">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <button
                type="button"
                onClick={goToPreviousMonth}
                className={`rounded-md border border-transparent p-1 transition ${
                  canGoPrev
                    ? "text-gray-600 hover:border-gray-300 hover:text-gray-800"
                    : "cursor-not-allowed text-gray-300"
                }`}
                disabled={!canGoPrev}
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-2">
                <select
                  className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  value={displayMonth}
                  onChange={handleMonthChange}
                >
                  {MONTH_LABELS.map((label, index) => (
                    <option key={label} value={index}>
                      {label}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  value={displayYear}
                  onChange={handleYearChange}
                >
                  {years.map((yearOption) => (
                    <option key={yearOption} value={yearOption}>
                      {yearOption}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={goToNextMonth}
                className={`rounded-md border border-transparent p-1 transition ${
                  canGoNext
                    ? "text-gray-600 hover:border-gray-300 hover:text-gray-800"
                    : "cursor-not-allowed text-gray-300"
                }`}
                disabled={!canGoNext}
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 px-3 pt-2 text-xs font-medium text-gray-500">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label} className="text-center uppercase tracking-wide">
                  {label}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 px-3 pb-3">
              {calendarDays.map((day) => {
                const dayKey = getDateKey(day.date);
                const isSelected = selectedKey === dayKey;
                const isToday = todayKey === dayKey;
                const isDisabled =
                  (minKey && dayKey < minKey) || (maxKey && dayKey > maxKey);

                const dayClasses = [
                  "relative flex h-10 w-10 items-center justify-center rounded-md text-sm transition",
                  day.currentMonth ? "text-gray-900" : "text-gray-400",
                  isSelected ? "bg-green-600 text-white" : "hover:bg-gray-100",
                  isDisabled ? "cursor-not-allowed text-gray-300 hover:bg-transparent" : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <button
                    type="button"
                    key={`${day.date.toISOString()}-${day.currentMonth ? "current" : "adjacent"}`}
                    onClick={() => handleSelectDay(day)}
                    className={dayClasses}
                    disabled={isDisabled}
                  >
                    {isToday && !isSelected && (
                      <span className="absolute inset-0 rounded-md border border-green-400" aria-hidden="true" />
                    )}
                    <span className="relative z-10 font-medium">
                      {day.date.getDate()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }
);

DatePicker.displayName = "DatePicker";

export default DatePicker;
