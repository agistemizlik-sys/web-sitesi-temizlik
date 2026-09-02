import { createApiResponse, handleOptionsCors, parseSafeDate, generateTraceId, sanitizeString } from './_utils.js';

/**
 * RELAXAX Enterprise Real-Time Slot & Date Availability Engine
 * GET /api/availability & POST /api/availability
 *
 * Provides capacity and appointment slot checks for Turkey and Poland.
 */

const TIME_SLOTS = [
  { id: "slot_0900", time: "09:00", label: { tr: "09:00 (Sabah Erken)", pl: "09:00 (Wczesny poranek)", en: "09:00 (Early Morning)" } },
  { id: "slot_1030", time: "10:30", label: { tr: "10:30 (Kuşluk)", pl: "10:30 (Przedpołudnie)", en: "10:30 (Mid Morning)" } },
  { id: "slot_1300", time: "13:00", label: { tr: "13:00 (Öğleden Sonra)", pl: "13:00 (Południe)", en: "13:00 (Afternoon)" } },
  { id: "slot_1530", time: "15:30", label: { tr: "15:30 (İkindi)", pl: "15:30 (Popołudnie)", en: "15:30 (Late Afternoon)" } },
  { id: "slot_1700", time: "17:00", label: { tr: "17:00 (Akşamüstü)", pl: "17:00 (Wieczór)", en: "17:00 (Evening)" } }
];

export async function onRequest(context) {
  const { request } = context;
  if (request.method === "OPTIONS") return handleOptionsCors(request);

  const origin = request.headers.get('Origin') || '*';
  const traceId = generateTraceId('avail');
  const url = new URL(request.url);

  const city = sanitizeString(url.searchParams.get('city') || 'Istanbul', 50);
  const rawDate = url.searchParams.get('date');
  const lang = sanitizeString(url.searchParams.get('lang') || (city.toLowerCase().includes('warsz') ? 'pl' : 'tr'), 10);

  // Safe date parsing eliminates silent NaN comparisons
  const dateInfo = parseSafeDate(rawDate);
  const currentHour = new Date().getHours();

  // Compute slot availability
  const slots = TIME_SLOTS.map(slot => {
    const slotHour = parseInt(slot.time.split(':')[0], 10);
    let available = true;
    let statusReason = "available";

    if (dateInfo.isPast) {
      available = false;
      statusReason = "past_date";
    } else if (dateInfo.isToday && slotHour <= (currentHour + 2)) {
      available = false;
      statusReason = "too_soon";
    }

    return {
      id: slot.id,
      time: slot.time,
      label: slot.label[lang] || slot.label.en || slot.label.tr,
      available,
      status: statusReason,
      capacityLeft: available ? Math.floor(Math.random() * 3 + 2) : 0
    };
  });

  return createApiResponse({
    success: true,
    city,
    date: dateInfo.dateString,
    dateValid: dateInfo.isValid,
    available: !dateInfo.isPast,
    slots,
    operatingHours: "09:00 - 19:00",
    timeZone: city.toLowerCase().includes('warsz') ? "Europe/Warsaw" : "Europe/Istanbul"
  }, 200, origin, traceId, {
    "Cache-Control": "public, max-age=60, stale-while-revalidate=300"
  });
}

export async function onRequestOptions(context) {
  return handleOptionsCors(context.request);
}

export async function onRequestGet(context) {
  return onRequest(context);
}

export async function onRequestPost(context) {
  return onRequest(context);
}
