import { executeCyberLoopSentinel } from './_security.js';
import { createApiResponse, createApiError, handleOptionsCors, parseAndValidateJson, generateTraceId, sanitizeString, sanitizeEmail, sanitizePhone, getCorsHeaders, logBackendEvent } from './_utils.js';

const sanitizeStr = sanitizeString;

const DEFAULT_STAFF_FLEET = [
  {
    id: 'staff_ayse_k',
    role: 'staff',
    name: 'Ayşe Kaya (Başuzman)',
    city: 'İstanbul',
    district: 'Kadıköy',
    rating: '4.98',
    experience: '6 Yıl',
    avatar: '👩‍💼',
    completedJobs: 412,
    badge: 'Kärcher Buhar & Kimyasal Sertifikalı'
  },
  {
    id: 'staff_mehmet_d',
    role: 'staff',
    name: 'Mehmet Demir (Saha Şefi)',
    city: 'İstanbul',
    district: 'Beşiktaş',
    rating: '4.95',
    experience: '8 Yıl',
    avatar: '👨‍💼',
    completedJobs: 630,
    badge: 'İnşaat & Endüstriyel Uzmanı'
  },
  {
    id: 'staff_zofia_k',
    role: 'staff',
    name: 'Zofia Kowalska (Koordynator)',
    city: 'Warszawa',
    district: 'Mokotów',
    rating: '4.99',
    experience: '5 Lat',
    avatar: '👩‍💼',
    completedJobs: 285,
    badge: 'Certyfikat Eko-Higieny'
  }
];

export async function onRequestOptions(context) {
  return handleOptionsCors(context.request, 'GET, POST, PATCH, OPTIONS');
}

// GET /api/staff - List staff fleet & applicants
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const type = url.searchParams.get('type') || 'all';
  const origin = request.headers.get('Origin') || '*';
  const corsHeaders = getCorsHeaders(origin);

  try {
    let staffFleet = [];
    let applicants = [];

    if (env && env.LEADS_KV) {
      try {
        const storedFleet = await env.LEADS_KV.get('kv_registered_staff', 'json');
        if (Array.isArray(storedFleet) && storedFleet.length > 0) {
          staffFleet = storedFleet;
        } else {
          staffFleet = DEFAULT_STAFF_FLEET;
        }
        applicants = await env.LEADS_KV.get('kv_staff_applicants', 'json') || [];
      } catch (e) {
        logBackendEvent('warn', 'STAFF', 'Staff KV retrieval failed, using fallback fleet', { error: e?.message || e });
        staffFleet = DEFAULT_STAFF_FLEET;
      }
    } else {
      staffFleet = DEFAULT_STAFF_FLEET;
    }

    return new Response(JSON.stringify({
      success: true,
      staff: staffFleet,
      applicants: applicants,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (e) {
    logBackendEvent('error', 'STAFF', 'Staff GET handler error', { error: e?.message || e });
    return new Response(JSON.stringify({ success: false, message: 'Personel listesi alinamadi.' }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// POST /api/staff - New Staff Application / Registration
export async function onRequestPost(context) {
  const { request, env } = context;
  const waitUntil = context.waitUntil ? context.waitUntil.bind(context) : null;
  const origin = request.headers.get('Origin') || '*';
  const corsHeaders = getCorsHeaders(origin);
  const traceId = generateTraceId('stf');

  try {
    const { data: body, error, status: vStatus } = await parseAndValidateJson(request, 15000);
    if (error) {
      return createApiError(error, vStatus, traceId, null, origin);
    }

    const cyberCheck = await executeCyberLoopSentinel(env, request, body, waitUntil);
    if (cyberCheck.blocked) return cyberCheck.response;

    const email = sanitizeEmail(body.email);
    const name = sanitizeStr(body.name);
    const phone = sanitizeStr(body.phone);
    const city = sanitizeStr(body.city || 'Istanbul');
    const district = sanitizeStr(body.district || '');
    const experience = sanitizeStr(body.experience || '3 Yil');

    if (!name || !email || !phone) {
      return new Response(JSON.stringify({ success: false, message: 'Lutfen tum zorunlu alanlari doldurunuz.' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const applicant = {
      id: 'app_' + Date.now().toString(36),
      name: name,
      email: email,
      phone: phone,
      city: city,
      district: district,
      experience: experience,
      appliedAt: new Date().toISOString(),
      status: 'Incelemede'
    };

    if (env && env.LEADS_KV) {
      try {
        let applicants = await env.LEADS_KV.get('kv_staff_applicants', 'json') || [];
        applicants.unshift(applicant);
        if (applicants.length > 200) applicants = applicants.slice(0, 200);
        await env.LEADS_KV.put('kv_staff_applicants', JSON.stringify(applicants));
      } catch (e) {
        logBackendEvent('warn', 'STAFF', 'Applicant KV persistence warning', { error: e?.message || e, applicantId: applicant.id });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      applicant: applicant,
      message: 'Personel basvurunuz basariyla alindi. Yonetici onayindan sonra iletisime gecilecektir.'
    }), {
      status: 201,
      headers: corsHeaders
    });
  } catch (e) {
    logBackendEvent('error', 'STAFF', 'Staff application handler error', { error: e?.message || e });
    return new Response(JSON.stringify({ success: false, message: 'Basvuru olusturulamadi.' }), {
      status: 400,
      headers: corsHeaders
    });
  }
}

// PATCH /api/staff - Approve / Reject / Promote Staff Applicant
export async function onRequestPatch(context) {
  const { request, env } = context;
  const origin = request.headers.get('Origin') || '*';
  const corsHeaders = getCorsHeaders(origin);
  const traceId = generateTraceId('stf');

  try {
    const { data: body, error, status: vStatus } = await parseAndValidateJson(request, 10000);
    if (error) {
      return createApiError(error, vStatus, traceId, null, origin);
    }

    const applicantId = sanitizeStr(body.applicantId || body.id, 40);
    const action = sanitizeStr(body.action || 'approve', 20); // 'approve' | 'reject' | 'delete'

    if (!applicantId) {
      return new Response(JSON.stringify({ success: false, message: 'Gecerli bir basvuru IDsi belirtiniz.' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    if (env && env.LEADS_KV) {
      try {
        let applicants = await env.LEADS_KV.get('kv_staff_applicants', 'json') || [];
        let staffFleet = await env.LEADS_KV.get('kv_registered_staff', 'json') || [...DEFAULT_STAFF_FLEET];
        const targetApp = applicants.find(a => a.id === applicantId);

        if (targetApp) {
          applicants = applicants.filter(a => a.id !== applicantId);
          if (action === 'approve') {
            const newStaff = {
              id: 'staff_' + Date.now().toString(36),
              role: 'staff',
              name: targetApp.name + ' (Temizlik Uzmani)',
              email: targetApp.email,
              phone: targetApp.phone,
              city: targetApp.city,
              district: targetApp.district,
              rating: '5.00',
              experience: targetApp.experience || '3 Yil',
              avatar: targetApp.name.toLowerCase().includes('ayse') ? '👩‍💼' : '🧹',
              registeredAt: new Date().toISOString()
            };
            staffFleet.push(newStaff);
            await env.LEADS_KV.put('kv_registered_staff', JSON.stringify(staffFleet));
          }
          await env.LEADS_KV.put('kv_staff_applicants', JSON.stringify(applicants));
        }
      } catch (e) {
        logBackendEvent('warn', 'STAFF', 'Staff action update in KV warning', { error: e?.message || e, applicantId, action });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      applicantId: applicantId,
      action: action,
      message: 'Islem basariyla gerceklestirildi.'
    }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (e) {
    logBackendEvent('error', 'STAFF', 'Staff PATCH exception', { error: e?.message || e });
    return new Response(JSON.stringify({ success: false, message: 'Islem basarisiz.' }), {
      status: 400,
      headers: corsHeaders
    });
  }
}

export async function onRequest(context) {
  const method = context.request.method;
  if (method === "OPTIONS") return onRequestOptions(context);
  if (method === "GET") return onRequestGet(context);
  if (method === "POST") return onRequestPost(context);
  if (method === "PATCH") return onRequestPatch(context);
  return createApiError("Method not allowed. Use GET, POST, or PATCH.", 405, null, null, context.request.headers.get('Origin') || '*');
}
