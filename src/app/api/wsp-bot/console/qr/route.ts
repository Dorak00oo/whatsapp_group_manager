import { auth } from "@/auth";
import { bearerMatches, getBearerToken } from "@/lib/wsp-bot-auth";
import { wspBotControlUrl } from "@/lib/wsp-bot-console";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function unauthorized() {
  return Response.json({ error: "No autorizado" }, { status: 401 });
}

function botAuthHeaders(): HeadersInit {
  const key = process.env.WSP_BOT_API_KEY?.trim();
  if (!key) return {};
  return { authorization: `Bearer ${key}` };
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    const token = getBearerToken(request);
    const key = process.env.WSP_BOT_API_KEY?.trim();
    if (!key || !token || !bearerMatches(key, token)) return unauthorized();
  }

  const url = wspBotControlUrl();
  try {
    const res = await fetch(`${url}/console/qr`, {
      headers: botAuthHeaders(),
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) {
      return new Response(null, {
        status: res.status,
        headers: { "cache-control": "no-store" },
      });
    }
    const png = Buffer.from(await res.arrayBuffer());
    return new Response(png, {
      status: 200,
      headers: {
        "content-type": "image/png",
        "cache-control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch {
    return new Response(null, {
      status: 503,
      headers: { "cache-control": "no-store" },
    });
  }
}
