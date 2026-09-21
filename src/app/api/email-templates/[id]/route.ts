import { NextResponse } from "next/server";
import { canEditEmailTemplates } from "@/lib/email/editorAccess";
import { getEmailTemplate } from "@/lib/cp/email/emailTemplatesRepository";

/**
 * One template's stored subject and body, for the builder's "start from an existing template".
 *
 * Only these two columns. The row also carries sender addresses and moderation flags, and a
 * "copy this template" action has no business handing those to the browser.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await canEditEmailTemplates())) {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }

  const { id } = await params;
  const template = await getEmailTemplate(id);
  if (!template) return NextResponse.json({ error: "No such template." }, { status: 404 });

  return NextResponse.json({ subject: template.subject ?? "", body_html: template.body_html ?? "" });
}
