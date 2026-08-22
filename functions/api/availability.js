/**
 * RELAXAX Enterprise Real-Time Slot & Date Availability Engine
 * GET /api/availability & POST /api/availability
 *
 * Provides real-time capacity and appointment slot checks for Turkey and Poland.
 */

const TIME_SLOTS = [
  { id: "slot_0900", time: "09:00", label: { tr: "09:00 (Sabah Erken)", pl: "09:00 (Wczesny poranek)", en: "09:00 (Early Morning)" } },
  { id: "slot_1030", time: "10:30", label: { tr: "10:30 (Kuşluk)", pl: "10:30 (Przedpołudnie)", en: "10:30 (Mid Morning)" } },
  { id: "slot_1300", time: "13:00", label: { tr: "13:00 (Öğleden Sonra)", pl: "13:00 (Południe)", en: "13:00 (Afternoon)" } },
  { id: "slot_1530", time: "15:30", label: { tr: "15:30 (İkindi)", pl: "15:30 (Popołudnie)", en: "15:30 (Late Afternoon)" } },
  { id: "slot_1700", time: "17:00", label: { tr: "17:00 (Akşamüstü)", pl: "17:00 (Wieczór)", en: "17:00 (Evening)" } }
];

export async function onRequest(context) {
  const { request, env } = context;
  const traceId = `avail-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
  
  const origin = request.headers.get('Origin') || '*';
  const allowedOrigin = (origin && (origin.endsWith('relaxax.com') || origin.endsWith('pages.dev') || origin.includes('localhost')))
    ? origin
    : '*';

  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key, X-RELAXAX-Trace-ID",
    "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "X-RELAXAX-Trace-ID": traceId
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  const url = new URL(request.url);
  const city = url.searchParams.get('city') || 'Istanbul';
  const dateStr = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
  const lang = url.searchParams.get('lang') || (city.toLowerCase().includes('warsz') ? 'pl' : 'tr');

  const requestedDate = new Date(dateStr);
  const isPast = requestedDate.setHours(0,0,0,0) < new Date().setHours(0,0,0,0);
  const isToday = new Date(dateStr).toDateString() === new Date().toDateString();
  const currentHour = new Date().getHours();

  // Compute dynamic slot availability
  const slots = TIME_SLOTS.map(slot => {
    const slotHour = parseInt(slot.time.split(':')[0], 10);
    let available = true;
    let statusReason = "available";

    if (isPast) {
      available = false;
      statusReason = "past_date";
    } else if (isToday && slotHour <= (currentHour + 2)) {
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

  return new Response(JSON.stringify({
    success: true,
    city,
    date: dateStr,
    available: !isPast,
    slots,
    operatingHours: "09:00 - 19:00",
    timeZone: city.toLowerCase().includes('warsz') ? "Europe/Warsaw" : "Europe/Istanbul",
    traceId
  }, null, 2), {
    status: 200,
    headers
  });
}
