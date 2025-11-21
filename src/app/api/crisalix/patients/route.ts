import { NextRequest, NextResponse } from "next/server";

const CRISALIX_API_BASE_URL =
  process.env.CRISALIX_API_BASE_URL ?? "https://api3d-staging.crisalix.com";

export async function POST(request: NextRequest) {
  const cookie = request.cookies.get("crisalix_tokens")?.value;

  if (!cookie) {
    return NextResponse.json(
      { error: "Missing Crisalix authentication. Please connect 3D again." },
      { status: 401 },
    );
  }

  let accessToken: string | null = null;
  try {
    const parsed = JSON.parse(cookie) as { access_token?: string | null };
    accessToken = parsed.access_token ?? null;
  } catch {
    accessToken = null;
  }

  if (!accessToken) {
    return NextResponse.json(
      { error: "Missing Crisalix access token. Please reconnect 3D." },
      { status: 401 },
    );
  }

  const incomingForm = await request.formData();

  const outboundForm = new FormData();
  for (const [key, value] of incomingForm.entries()) {
    outboundForm.append(key, value as File | string);
  }

  const url = `${CRISALIX_API_BASE_URL}/patients`;

  const crisalixResponse = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: outboundForm,
  });

  if (!crisalixResponse.ok) {
    let body: unknown = null;
    try {
      body = await crisalixResponse.json();
    } catch {
      body = await crisalixResponse.text().catch(() => null);
    }

    return NextResponse.json(
      {
        error: "Crisalix patient creation failed",
        status: crisalixResponse.status,
        details: body,
      },
      { status: 502 },
    );
  }

  const data = await crisalixResponse.json();
  return NextResponse.json(data);
}
