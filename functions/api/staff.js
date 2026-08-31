import { executeCyberLoopSentinel, getTrustedClientIp, sanitizeSafeString } from './_security.js';

function sanitizeStr(str, maxLen = 300) {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>?/gm, '').trim().substring(0, maxLen);
}

function sanitizeEmail(email) {
  if (typeof email !== 'string') return '';
  return email.toLowerCase().trim().substring(0, 150);
}

function getCorsHeaders(origin) {
  const allowed = (origin && (origin.endsWith('relaxax.com') || origin.endsWith('pages.dev') || origin.includes('localhost') || origin.includes('127.0.0.1')))
    ? origin
    : '*';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-RELAXAX-Signature',
    'X-Content-Type-Options': 'nosniff',
    'Content-Type': 'application/json; charset=utf-8'
  };
}

export async function onRequestOptions(context) {
  const origin = context.request.headers.get('Origin') || '*';
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(origin)
  });
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
        staffFleet = await env.LEADS_KV.get('kv_registered_staff', 'json') || [];
        applicants = await env.LEADS_KV.get('kv_staff_applicants', 'json') || [];
      } catch (e) {}
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

  try {
    const body = await request.json();
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
      } catch (e) {}
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

  try {
    const body = await request.json();
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
        let staffFleet = await env.LEADS_KV.get('kv_registered_staff', 'json') || [];
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
      } catch (e) {}
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
    return new Response(JSON.stringify({ success: false, message: 'Islem basarisiz.' }), {
      status: 400,
      headers: corsHeaders
    });
  }
}
