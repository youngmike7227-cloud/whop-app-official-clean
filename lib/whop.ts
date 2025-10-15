// lib/whop.ts
export async function exchangeCodeForToken(code: string) {
  const r = await fetch("https://<WHOP_TOKEN_ENDPOINT>", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      client_id: process.env.WHOP_CLIENT_ID,
      client_secret: process.env.WHOP_CLIENT_SECRET,
      redirect_uri: process.env.WHOP_REDIRECT_URI
    })
  });
  if (!r.ok) throw new Error("token exchange failed");
  return r.json(); // { access_token, ... }
}

export async function getMembershipStatus(token: { access_token: string }) {
  const r = await fetch("https://<WHOP_API>/v1/me/memberships", {
    headers: { Authorization: `Bearer ${token.access_token}` }
  });
  const data = await r.json();
  const plan = process.env.WHOP_PLAN_ID!;
  return data?.memberships?.some((m: any) => m.plan_id === plan && m.status === "active");
}
