import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ code: string }> }
) {
    const { code } = await params;

    // Skip stats and unlock sub-routes (Next.js handles them separately)
    if (code === 'stats' || code === 'unlock' || code === 'bulk') {
        return NextResponse.next();
    }

    const host = _request.headers.get('x-forwarded-host') || _request.headers.get('host') || 'localhost';
    const protocol = _request.headers.get('x-forwarded-proto') || 'http';
    const baseUrl = `${protocol}://${host}`;

    try {
        // Always prefer the internal URL if available so we don't have networking weirdness in Docker
        const internalApiUrl = process.env.INTERNAL_API_URL || (API_URL.startsWith('/') ? `http://backend:3001` : API_URL);
        const fetchUrl = `${internalApiUrl.replace(/\/$/, '')}/${code}`; // remove trailing slash if present

        const res = await fetch(fetchUrl, { redirect: 'manual' });

        // 302 / 301 — pass the redirect straight through to the browser
        if (res.status === 301 || res.status === 302) {
            const location = res.headers.get('Location');
            if (location) {
                return NextResponse.redirect(location, { status: res.status });
            }
        }

        // 200 — could be { requiresPassword: true }
        if (res.status === 200) {
            const body = await res.json().catch(() => null);
            if (body?.requiresPassword) {
                return NextResponse.redirect(`${baseUrl}/${code}/unlock`);
            }
        }

        // 404 / 410 / other errors — redirect home with error info
        return NextResponse.redirect(`${baseUrl}/?error=${res.status}`);
    } catch (e) {
        return NextResponse.redirect(`${baseUrl}/`);
    }
}
