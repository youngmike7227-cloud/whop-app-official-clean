export async function exchangeCodeForToken(code: string) {
  // TODO: call Whop token endpoint with code, client_id/secret and redirect_uri
  return { access_token: "mock" };
}

export async function getMembershipStatus(token: { access_token: string }) {
  // TODO: fetch Whop membership/entitlement for user
  return true; // mock active
}
