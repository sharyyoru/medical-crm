"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseClient } from "@/lib/supabaseClient";

type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

type AppointmentPatient = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};

type CalendarAppointment = {
  id: string;
  patient_id: string;
  start_time: string;
  end_time: string | null;
  status: AppointmentStatus;
  reason: string | null;
  location: string | null;
  patient: AppointmentPatient | null;
};

type CalendarView = "month" | "day" | "range";

const DAY_VIEW_START_MINUTES = 8 * 60;
const DAY_VIEW_END_MINUTES = 17 * 60;
const DAY_VIEW_SLOT_MINUTES = 15;
const DAY_VIEW_SLOT_HEIGHT = 48;

function formatMonthYear(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function formatYmd(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function CalendarPage() {
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [showAppointments, setShowAppointments] = useState(true);
  const [view, setView] = useState<CalendarView>("month");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [rangeEndDate, setRangeEndDate] = useState<Date | null>(null);
  const [isDraggingRange, setIsDraggingRange] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftStart, setDraftStart] = useState("");
  const [draftEnd, setDraftEnd] = useState("");
  const [draftLocation, setDraftLocation] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [savingCreate, setSavingCreate] = useState(false);

  const monthStart = useMemo(() => {
    return new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  }, [visibleMonth]);

  const monthEnd = useMemo(() => {
    return new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0, 23, 59, 59, 999);
  }, [visibleMonth]);

  useEffect(() => {
    let isMounted = true;

    async function loadAppointments() {
      try {
        setLoading(true);
        setError(null);

        const fromIso = monthStart.toISOString();
        const toIso = monthEnd.toISOString();

        const { data, error } = await supabaseClient
          .from("appointments")
          .select(
            "id, patient_id, start_time, end_time, status, reason, location, patient:patients(id, first_name, last_name)",
          )
          .gte("start_time", fromIso)
          .lte("start_time", toIso)
          .order("start_time", { ascending: true });

        if (!isMounted) return;

        if (error || !data) {
          setError(error?.message ?? "Failed to load appointments.");
          setAppointments([]);
          setLoading(false);
          return;
        }

        setAppointments(data as unknown as CalendarAppointment[]);
        setLoading(false);
      } catch {
        if (!isMounted) return;
        setError("Failed to load appointments.");
        setAppointments([]);
        setLoading(false);
      }
    }

    void loadAppointments();

    return () => {
      isMounted = false;
    };
  }, [monthStart, monthEnd]);

  useEffect(() => {
    if (!isDraggingRange) return;

    function handleMouseUp() {
      setIsDraggingRange(false);
    }

    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingRange]);

  const appointmentsByDay = useMemo(() => {
    const map: Record<string, CalendarAppointment[]> = {};
    if (!showAppointments) return map;

    const search = patientSearch.trim().toLowerCase();

    appointments.forEach((appt) => {
      const key = appt.start_time ? appt.start_time.slice(0, 10) : null;
      if (!key) return;

      if (search) {
        const p = appt.patient;
        const name = `${p?.first_name ?? ""} ${p?.last_name ?? ""}`
          .trim()
          .toLowerCase();
        if (!name.includes(search)) return;
      }

      if (!map[key]) map[key] = [];
      map[key].push(appt);
    });

    return map;
  }, [appointments, patientSearch, showAppointments]);

  const gridDates = useMemo(() => {
    const dates: Date[] = [];
    const firstDayOfWeek = 0; // Sunday
    const firstOfMonth = new Date(
      visibleMonth.getFullYear(),
      visibleMonth.getMonth(),
      1,
    );
    const startWeekday = firstOfMonth.getDay();
    const diff = (startWeekday - firstDayOfWeek + 7) % 7;
    const gridStart = new Date(
      firstOfMonth.getFullYear(),
      firstOfMonth.getMonth(),
      firstOfMonth.getDate() - diff,
    );

    for (let i = 0; i < 42; i += 1) {
      const d = new Date(
        gridStart.getFullYear(),
        gridStart.getMonth(),
        gridStart.getDate() + i,
      );
      dates.push(d);
    }

    return dates;
  }, [visibleMonth]);

  const todayYmd = formatYmd(new Date());
  const visibleMonthIndex = visibleMonth.getMonth();

  const activeRangeDates = useMemo(() => {
    if (!selectedDate) return [] as Date[];
    if (view === "day" || !rangeEndDate) {
      return [selectedDate];
    }

    const start = selectedDate < rangeEndDate ? selectedDate : rangeEndDate;
    const end = selectedDate < rangeEndDate ? rangeEndDate : selectedDate;

    const dates: Date[] = [];
    const current = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }, [view, selectedDate, rangeEndDate]);

  const timeSlots = useMemo(() => {
    const values: number[] = [];
    for (
      let minutes = DAY_VIEW_START_MINUTES;
      minutes < DAY_VIEW_END_MINUTES;
      minutes += DAY_VIEW_SLOT_MINUTES
    ) {
      values.push(minutes);
    }
    return values;
  }, []);

  function formatTimeLabel(totalMinutes: number): string {
    if (totalMinutes === DAY_VIEW_END_MINUTES - DAY_VIEW_SLOT_MINUTES) {
      return "5:00 PM";
    }

    const minutes = totalMinutes % 60;
    if (minutes !== 0) return "";

    const hour = Math.floor(totalMinutes / 60);
    const suffix = hour >= 12 ? "PM" : "AM";
    let display = hour % 12;
    if (display === 0) display = 12;
    return `${display}:00 ${suffix}`;
  }

  function goToToday() {
    const now = new Date();
    setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  }

  function goPrevMonth() {
    setVisibleMonth((prev) =>
      new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
    );
  }

  function goNextMonth() {
    setVisibleMonth((prev) =>
      new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
    );
  }

  function handleMiniDayMouseDown(date: Date) {
    setSelectedDate(date);
    setRangeEndDate(null);
    setIsDraggingRange(true);
    setView("day");
  }

  function handleMiniDayMouseEnter(date: Date) {
    if (!isDraggingRange || !selectedDate) return;
    setRangeEndDate(date);
    setView("range");
  }

  function handleMonthDayClick(date: Date) {
    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    setSelectedDate(date);
    setRangeEndDate(null);
    setView("day");
  }

  return (
    <div className="flex h-[calc(100vh-96px)] gap-4 px-0 pb-4 pt-2 sm:px-1 lg:px-2">
      {/* Left sidebar similar to Google Calendar */}
      <aside className="hidden w-64 flex-shrink-0 flex-col rounded-3xl border border-slate-200/80 bg-white/95 p-3 text-xs text-slate-700 shadow-[0_18px_40px_rgba(15,23,42,0.10)] md:flex">
        <div className="mb-3">
          <button
            type="button"
            onClick={() => {
              setCreateModalOpen(true);
            }}
            className="inline-flex w-full items-center justify-center rounded-full bg-sky-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-sky-700"
          >
            Create
          </button>
        </div>
        {/* Mini month */}
        <div className="mb-4 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-2">
          <div className="mb-2 flex items-center justify-between text-[11px] font-medium text-slate-700">
            <button
              type="button"
              onClick={goPrevMonth}
              className="inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-slate-100"
              aria-label="Previous month"
            >
              <svg
                className="h-3 w-3"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 4 6 10l6 6" />
              </svg>
            </button>
            <span>{formatMonthYear(visibleMonth)}</span>
            <button
              type="button"
              onClick={goNextMonth}
              className="inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-slate-100"
              aria-label="Next month"
            >
              <svg
                className="h-3 w-3"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m8 4 6 6-6 6" />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-7 text-[9px] font-medium uppercase tracking-wide text-slate-500">
            {["S", "M", "T", "W", "T", "F", "S"].map((label, index) => (
              <div key={`${label}-${index}`} className="px-1 py-0.5 text-center">
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 text-[10px]">
            {gridDates.map((date) => {
              const ymd = formatYmd(date);
              const isToday = ymd === todayYmd;
              const isCurrentMonth = date.getMonth() === visibleMonthIndex;

              // Highlight if inside selected range
              const inRange = (() => {
                if (!selectedDate) return false;
                if (!rangeEndDate || view === "day") {
                  return ymd === formatYmd(selectedDate);
                }
                const start = selectedDate < rangeEndDate ? selectedDate : rangeEndDate;
                const end = selectedDate < rangeEndDate ? rangeEndDate : selectedDate;
                const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                return d >= start && d <= end;
              })();

              return (
                <button
                  key={ymd + "mini"}
                  type="button"
                  onMouseDown={() => handleMiniDayMouseDown(date)}
                  onMouseEnter={() => handleMiniDayMouseEnter(date)}
                  onClick={() =>
                    setVisibleMonth(
                      new Date(date.getFullYear(), date.getMonth(), 1),
                    )
                  }
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] ${
                    isCurrentMonth ? "text-slate-700" : "text-slate-400"
                  } ${
                    isToday
                      ? "bg-sky-600 text-white shadow-sm"
                      : inRange
                        ? "bg-sky-100 text-sky-800"
                        : "hover:bg-slate-100"
                  }`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search patient */}
        <div className="mb-4">
          <input
            type="text"
            value={patientSearch}
            onChange={(event) => setPatientSearch(event.target.value)}
            placeholder="Search patient"
            className="w-full rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>

        {/* My calendars */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            My calendars
          </p>
          <label className="flex cursor-pointer items-center gap-2 text-[11px] text-slate-700">
            <input
              type="checkbox"
              checked={showAppointments}
              onChange={(event) => setShowAppointments(event.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            />
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-sky-500" />
              Appointments
            </span>
          </label>
        </div>

        {/* Booking pages / Other calendars placeholders */}
        <div className="mt-4 space-y-2 text-[10px] text-slate-500">
          <p className="font-semibold">Booking pages</p>
          <p className="text-slate-400">Coming soon</p>
        </div>
        <div className="mt-4 space-y-2 text-[10px] text-slate-500">
          <p className="font-semibold">Other calendars</p>
          <p className="text-slate-400">Coming soon</p>
        </div>
      </aside>

      {/* Main month view */}
      <div className="flex min-w-0 flex-1 flex-col space-y-4">
        {/* Calendar header controls */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-lg font-semibold text-slate-900">Calendar</h1>
            <button
              type="button"
              onClick={goToToday}
              className="inline-flex items-center rounded-full border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Today
            </button>
            <div className="inline-flex items-center rounded-full border border-slate-200/80 bg-white px-1 py-0.5 text-slate-600 shadow-sm">
              <button
                type="button"
                onClick={goPrevMonth}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-slate-50"
                aria-label="Previous month"
              >
                <svg
                  className="h-3 w-3"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 4 6 10l6 6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={goNextMonth}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-slate-50"
                aria-label="Next month"
              >
                <svg
                  className="h-3 w-3"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m8 4 6 6-6 6" />
                </svg>
              </button>
            </div>
            <span className="text-sm font-medium text-slate-800">
              {view === "month" && formatMonthYear(visibleMonth)}
              {view === "day" &&
                selectedDate &&
                selectedDate.toLocaleDateString(undefined, {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              {view === "range" && activeRangeDates.length > 0 && (
                <>
                  {activeRangeDates[0].toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                  {" – "}
                  {activeRangeDates[activeRangeDates.length - 1].toLocaleDateString(
                    undefined,
                    {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    },
                  )}
                </>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <button
              type="button"
              className="inline-flex items-center rounded-full border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              {view === "month" ? "Month" : activeRangeDates.length === 1 ? "Day" : "Multi-day"}
            </button>
          </div>
        </div>
        {view === "month" ? (
          <div className="flex-1 rounded-3xl border border-slate-200/80 bg-white/95 text-xs shadow-[0_18px_40px_rgba(15,23,42,0.10)]">
            <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/80 text-[11px] font-medium uppercase tracking-wide text-slate-500">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
                <div key={label} className="px-3 py-2">
                  {label}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 grid-rows-6 text-[11px] text-slate-800">
              {gridDates.map((date) => {
                const ymd = formatYmd(date);
                const dayAppointments = appointmentsByDay[ymd] ?? [];
                const isToday = ymd === todayYmd;
                const isCurrentMonth = date.getMonth() === visibleMonthIndex;

                return (
                  <div
                    key={ymd + date.getDate()}
                    onClick={() => handleMonthDayClick(date)}
                    className={`min-h-[110px] cursor-pointer border-b border-slate-100 px-1.5 py-1.5 ${
                      isCurrentMonth ? "bg-white" : "bg-slate-50/60 text-slate-400"
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-medium ${
                          isToday
                            ? "bg-sky-600 text-white shadow-sm"
                            : "text-slate-600"
                        }`}
                      >
                        {date.getDate()}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {dayAppointments.map((appt) => {
                        const p = appt.patient;
                        const patientName = p
                          ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() ||
                            "Unknown patient"
                          : "Unknown patient";

                        const start = new Date(appt.start_time);
                        const timeLabel = Number.isNaN(start.getTime())
                          ? ""
                          : start.toLocaleTimeString(undefined, {
                              hour: "2-digit",
                              minute: "2-digit",
                            });

                        const reason = appt.reason ?? "Appointment";

                        return (
                          <Link
                            key={appt.id}
                            href={`/patients/${appt.patient_id}`}
                            className="block truncate rounded-md bg-sky-50 px-2 py-1 text-[10px] text-sky-800 hover:bg-sky-100"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-semibold">
                                {patientName}
                              </span>
                              {timeLabel ? (
                                <span className="text-[9px] text-slate-500">
                                  {timeLabel}
                                </span>
                              ) : null}
                            </div>
                            <div className="truncate text-[9px] text-slate-600">
                              {reason}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            {loading ? (
              <div className="border-t border-slate-100 px-3 py-2 text-[11px] text-slate-500">
                Loading appointments...
              </div>
            ) : error ? (
              <div className="border-t border-slate-100 px-3 py-2 text-[11px] text-red-600">
                {error}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex-1 rounded-3xl border border-slate-200/80 bg-white/95 text-xs shadow-[0_18px_40px_rgba(15,23,42,0.10)]">
            {activeRangeDates.length === 0 ? (
              <div className="px-4 py-4 text-[11px] text-slate-500">
                Select a date in the mini calendar to see its schedule.
              </div>
            ) : (
              <div className="flex h-full flex-col text-[11px] text-slate-800">
                <div className="flex border-b border-slate-100 bg-slate-50/80 text-[11px] font-medium text-slate-600">
                  <div className="w-12 flex-shrink-0" />
                  {activeRangeDates.map((date) => {
                    const ymd = formatYmd(date);

                    return (
                      <div
                        key={ymd}
                        className="flex-1 px-3 py-2 text-center"
                      >
                        <div className="text-[10px] uppercase tracking-wide text-slate-500">
                          {date.toLocaleDateString(undefined, {
                            weekday: "short",
                          })}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-800">
                          {date.toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="relative flex-1 bg-white">
                  <div className="relative flex h-full overflow-y-auto calendar-scroll">
                    <div className="z-10 w-16 flex-shrink-0 border-r border-slate-100 bg-white">
                      <div className="relative" style={{ height: timeSlots.length * DAY_VIEW_SLOT_HEIGHT }}>
                        {timeSlots.map((minutes) => (
                          <div
                            key={minutes}
                            className="flex items-end justify-end pr-2 text-[10px] text-slate-400"
                            style={{ height: DAY_VIEW_SLOT_HEIGHT }}
                          >
                            {formatTimeLabel(minutes)}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="relative flex-1">
                      <div className="pointer-events-none absolute inset-0">
                        <div
                          className="relative w-full"
                          style={{ height: timeSlots.length * DAY_VIEW_SLOT_HEIGHT }}
                        >
                          {timeSlots.map((minutes, index) => (
                            <div
                              key={minutes}
                              className={
                                minutes % 60 === 0
                                  ? "absolute left-0 right-0 border-t border-slate-200"
                                  : "absolute left-0 right-0 border-t border-slate-100"
                              }
                              style={{
                                top: index * DAY_VIEW_SLOT_HEIGHT,
                              }}
                            />
                          ))}
                        </div>
                      </div>
                      <div
                        className="relative flex"
                        style={{ height: timeSlots.length * DAY_VIEW_SLOT_HEIGHT }}
                      >
                        {activeRangeDates.map((date) => {
                          const ymd = formatYmd(date);
                          const dayAppointments = appointmentsByDay[ymd] ?? [];
                          const columnHeight = timeSlots.length * DAY_VIEW_SLOT_HEIGHT;
                          const windowMinutes =
                            DAY_VIEW_END_MINUTES - DAY_VIEW_START_MINUTES;

                          return (
                            <div
                              key={ymd}
                              className="relative flex-1 border-r border-slate-100 last:border-r-0"
                            >
                              {dayAppointments.map((appt) => {
                                const p = appt.patient;
                                const patientName = p
                                  ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() ||
                                    "Unknown patient"
                                  : "Unknown patient";

                                const start = new Date(appt.start_time);
                                const hasValidStart = !Number.isNaN(start.getTime());
                                const end = appt.end_time
                                  ? new Date(appt.end_time)
                                  : null;
                                const rawStartMinutes = hasValidStart
                                  ? start.getHours() * 60 + start.getMinutes()
                                  : DAY_VIEW_START_MINUTES;

                                let startMinutes = rawStartMinutes;
                                if (startMinutes < DAY_VIEW_START_MINUTES) {
                                  startMinutes = DAY_VIEW_START_MINUTES;
                                }
                                if (startMinutes > DAY_VIEW_END_MINUTES - DAY_VIEW_SLOT_MINUTES) {
                                  startMinutes =
                                    DAY_VIEW_END_MINUTES - DAY_VIEW_SLOT_MINUTES;
                                }

                                let endMinutes = startMinutes + 60;

                                if (end && !Number.isNaN(end.getTime())) {
                                  endMinutes =
                                    end.getHours() * 60 + end.getMinutes();
                                }

                                if (endMinutes <= startMinutes) {
                                  endMinutes = startMinutes + DAY_VIEW_SLOT_MINUTES * 2;
                                }

                                if (endMinutes > DAY_VIEW_END_MINUTES) {
                                  endMinutes = DAY_VIEW_END_MINUTES;
                                }

                                const durationMinutes = Math.max(
                                  endMinutes - startMinutes,
                                  DAY_VIEW_SLOT_MINUTES,
                                );

                                const topOffsetMinutes =
                                  startMinutes - DAY_VIEW_START_MINUTES;
                                const top =
                                  (topOffsetMinutes / windowMinutes) * columnHeight;

                                let height =
                                  (durationMinutes / windowMinutes) * columnHeight;
                                const minHeight = DAY_VIEW_SLOT_HEIGHT * 1.5;
                                if (!Number.isFinite(height) || height <= 0) {
                                  height = minHeight;
                                }
                                if (height < minHeight) {
                                  height = minHeight;
                                }

                                const timeLabel = hasValidStart
                                  ? start.toLocaleTimeString(undefined, {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : "";

                                const reason = appt.reason ?? "Appointment";

                                return (
                                  <Link
                                    key={appt.id}
                                    href={`/patients/${appt.patient_id}`}
                                    className="absolute left-1 right-1 overflow-hidden rounded-md border border-sky-100 bg-sky-50 px-2 py-1 text-[10px] text-sky-900 shadow-sm hover:bg-sky-100"
                                    style={{ top, height }}
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="font-semibold">
                                        {patientName}
                                      </span>
                                      {timeLabel ? (
                                        <span className="text-[9px] text-slate-500">
                                          {timeLabel}
                                        </span>
                                      ) : null}
                                    </div>
                                    <div className="truncate text-[9px] text-slate-600">
                                      {reason}
                                    </div>
                                  </Link>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {createModalOpen ? (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white/95 p-4 text-xs shadow-[0_24px_60px_rgba(15,23,42,0.65)]">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-sm font-semibold text-slate-900">Add appointment</h2>
                <button
                  type="button"
                  onClick={() => {
                    if (savingCreate) return;
                    setCreateModalOpen(false);
                  }}
                  className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-500 shadow-sm hover:bg-slate-50"
                >
                  <span className="sr-only">Close</span>
                  <svg
                    className="h-3 w-3"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 5l10 10" />
                    <path d="M15 5L5 15" />
                  </svg>
                </button>
              </div>
              <div className="mt-3 space-y-3">
                <div className="space-y-1">
                  <input
                    type="text"
                    value={draftTitle}
                    onChange={(event) => setDraftTitle(event.target.value)}
                    className="w-full border-b border-slate-200 bg-transparent px-0 pb-1 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none"
                    placeholder="Add title"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-slate-600">Date &amp; time</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="datetime-local"
                      value={draftStart}
                      onChange={(event) => setDraftStart(event.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50/80 px-2 py-1.5 text-xs text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                    <input
                      type="datetime-local"
                      value={draftEnd}
                      onChange={(event) => setDraftEnd(event.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50/80 px-2 py-1.5 text-xs text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-slate-600">Location</p>
                  <input
                    type="text"
                    value={draftLocation}
                    onChange={(event) => setDraftLocation(event.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    placeholder="Add location"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-slate-600">Description</p>
                  <textarea
                    value={draftDescription}
                    onChange={(event) => setDraftDescription(event.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    placeholder="Add notes for this appointment"
                  />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="text-[11px] font-medium text-sky-600 hover:underline hover:underline-offset-2"
                >
                  More options
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (savingCreate) return;
                      setCreateModalOpen(false);
                    }}
                    className="inline-flex items-center rounded-full border border-slate-200/80 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={savingCreate}
                    className="inline-flex items-center rounded-full border border-sky-500/80 bg-sky-600 px-3 py-1.5 text-[11px] font-medium text-white shadow-sm hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
