import { redirect } from "next/navigation";

// Redirects to /manage/[token], which handles cancellation with a confirmation
// step, plus date/time changes in one unified page.
export default async function CancelPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  redirect(`/manage/${token}`);
}
