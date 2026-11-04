import { notFound } from "next/navigation";
import { getEnv } from "@/lib/db";
import { currentHost } from "@/lib/tenant";
import { AdminLoginForm } from "./AdminLoginForm";

export default async function AdminLogin() {
  if ((await currentHost()) !== (await getEnv()).ADMIN_HOST) notFound();
  return (
    <div className="mx-auto max-w-sm pt-16">
      <h1 className="mb-6 text-center text-2xl font-extrabold">Next Level Stores · Admin</h1>
      <AdminLoginForm />
    </div>
  );
}
