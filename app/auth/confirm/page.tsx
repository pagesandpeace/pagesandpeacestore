import Link from "next/link";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const value = (input: string | string[] | undefined) => typeof input === "string" ? input : "";

export default async function ConfirmSignInPage({ searchParams }: Props) {
  const params = await searchParams;
  const tokenHash = value(params.token_hash);
  const type = value(params.type);
  const valid = tokenHash && ["magiclink", "signup", "recovery"].includes(type);
  if (!valid) return <main className="mx-auto max-w-md px-6 py-20 text-center"><h1 className="text-3xl font-semibold text-[#111]">This link is not valid</h1><p className="mt-3 text-[#555]">Please request a new sign-in link and try again.</p><Link className="mt-6 inline-block underline font-semibold" href="/sign-in">Return to sign in</Link></main>;
  return <main className="mx-auto max-w-md px-6 py-20 text-center"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7a6550]">Pages &amp; Peace</p><h1 className="mt-3 text-3xl font-semibold text-[#111]">Ready to sign you in</h1><p className="mt-3 text-[#555]">For your security, press continue to use this one-time link.</p><form action="/auth/confirm/complete" method="post" className="mt-8"><input type="hidden" name="token_hash" value={tokenHash}/><input type="hidden" name="type" value={type}/><input type="hidden" name="callbackURL" value={value(params.callbackURL)}/><input type="hidden" name="intent" value={value(params.intent)}/><input type="hidden" name="marketing_consent" value={value(params.marketing_consent)}/><button className="w-full rounded-lg bg-[#1a1a1a] px-5 py-3 font-semibold text-white hover:bg-[#333]" type="submit">Continue securely</button></form><p className="mt-5 text-sm text-[#666]">If you did not request this, you can safely close this page.</p></main>;
}
