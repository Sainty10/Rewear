"use server";
import { db } from "@/lib/supabase";
import { redirect } from "next/navigation";
export async function signIn(form: FormData) {
  const client = await db();
  const { error } = await client.auth.signInWithPassword({
    email: String(form.get("email")),
    password: String(form.get("password")),
  });
  if (error)
    redirect(
      "/auth?error=" +
        encodeURIComponent(
          "Sign in failed. Check your credentials and verify your email.",
        ),
    );
  redirect("/account");
}
export async function signUp(form: FormData) {
  const password = String(form.get("password"));
  if (password.length < 12 || password.length > 128)
    redirect("/auth?error=Use+a+password+of+12+to+128+characters");
  const client = await db();
  const { error } = await client.auth.signUp({
    email: String(form.get("email")),
    password,
    options: {
      data: {
        display_name: String(form.get("display_name") || "Rewear member").slice(
          0,
          80,
        ),
      },
      emailRedirectTo: `${process.env.APP_URL}/auth/callback`,
    },
  });
  if (error)
    redirect("/auth?error=Unable+to+create+account.+Please+try+again.");
  redirect("/auth?notice=Check+your+email+to+verify+your+account");
}
export async function signOut() {
  const client = await db();
  await client.auth.signOut();
  redirect("/");
}
export async function resetPassword(form: FormData) {
  const client = await db();
  await client.auth.resetPasswordForEmail(String(form.get("email")), {
    redirectTo: `${process.env.APP_URL}/auth/callback?next=/account/password`,
  });
  redirect(
    "/auth?notice=If+that+email+has+an+account,+a+password+reset+link+has+been+sent.",
  );
}
export async function updatePassword(form: FormData) {
  const client = await db();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) redirect("/auth");
  const password = String(form.get("password"));
  if (password.length < 12 || password.length > 128)
    redirect("/account/password?error=Use+12+to+128+characters");
  const { error } = await client.auth.updateUser({ password });
  if (error)
    redirect(
      "/account/password?error=Could+not+update+password.+Request+a+fresh+reset+link.",
    );
  await client.auth.signOut({ scope: "global" });
  redirect("/auth?notice=Password+updated.+Please+sign+in+again.");
}
