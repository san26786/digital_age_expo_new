import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDomain } from "@/lib/services/domain";
import { contactEnquirySchema } from "@/lib/validations/contactEnquiry";
import { sendTemplatedEmail } from "@/lib/email/sendTemplatedEmail";
import { getEmailTemplate, ensureDefaultTemplates } from "@/lib/cp/email/emailTemplatesRepository";
import { resolveMailTransport } from "@/lib/email/siteMailSettings";
import fs from "fs";
import path from "path";

const BACKUP_FILE_PATH = path.join(process.cwd(), "src", "app", "api", "contact", "data.json");

// Helper to read backup contact records
function readBackupContacts() {
  try {
    if (!fs.existsSync(BACKUP_FILE_PATH)) {
      const dir = path.dirname(BACKUP_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(BACKUP_FILE_PATH, JSON.stringify([], null, 2));
      return [];
    }
    const data = fs.readFileSync(BACKUP_FILE_PATH, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading contact backup:", err);
    return [];
  }
}

// Helper to write backup contact records
function writeBackupContacts(data: any[]) {
  try {
    const dir = path.dirname(BACKUP_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(BACKUP_FILE_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error("Error writing contact backup:", err);
    return false;
  }
}

export async function GET() {
  try {
    const contacts = readBackupContacts();
    return NextResponse.json(contacts);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = contactEnquirySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const domain = await getDomain();
    const { first_name, last_name, email, contact, message } = parsed.data;

    let enquiryId = "enq_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);

    // Try creating via Prisma
    try {
      const enquiry = await prisma.find_user_enquiry.create({
        data: {
          first_name,
          last_name: last_name || null,
          name: [first_name, last_name].filter(Boolean).join(" "),
          email,
          contact: contact || null,
          message,
          event_id: domain.event_id,
          source_domain: domain.name,
          years_experiece: "",
          status: "new",
          assigned_sales_user: 0,
          exhibit_in_show: "",
        },
        select: { id: true },
      });

      if (enquiry && enquiry.id) {
        enquiryId = String(enquiry.id);
      }
    } catch (dbError) {
      console.warn("[API Contact] Failed to save in main database, using fallback ID:", dbError);
    }

    // Always save to backup JSON file for reliable tracking
    const backupData = readBackupContacts();
    const newEntry = {
      id: enquiryId,
      first_name,
      last_name: last_name || "",
      email,
      contact: contact || "",
      message,
      created_at: new Date().toISOString(),
    };
    backupData.push(newEntry);
    writeBackupContacts(backupData);

    /*
     * ---------------------------------------------------------------------------
     *  TELL SOMEBODY THE ENQUIRY ARRIVED
     * ---------------------------------------------------------------------------
     *
     *  Until now this route stored the enquiry in find_user_enquiry and the JSON backup and
     *  then stopped. Nothing emailed anyone, so an enquiry was only ever seen if an organiser
     *  happened to open the enquiries screen - and the contact_request template that exists for
     *  exactly this was seeded blank and never sent by anything.
     *
     *  Recipient order is deliberate. The template's own `recipients` column is the legacy
     *  form's field for fixed admin-notification addresses, which is precisely this case, so it
     *  wins; the site's configured from-address is the fallback so a site that never filled that
     *  column still gets its enquiries. With neither, there is nobody to tell and we skip.
     *
     *  Wrapped and awaited but never allowed to throw: the enquiry is already saved by this
     *  point, and a mail problem must not turn a stored enquiry into a 500 that tells the
     *  visitor their message failed. The outcome rides along in the response for the logs
     *  without changing the existing `success` / `id` contract.
     */
    let notified: string | null = null;
    try {
      /*
       * Seed only if the row is actually missing, never up front. ensureDefaultTemplates() is
       * ten findUniques plus up to ten writes, and this is a public endpoint - running it on
       * every enquiry would put that on the critical path of a form submission for rows that
       * are almost always already there. Same shape sendRegistrationEmail.ts uses.
       */
      let template = await getEmailTemplate("contact_request");
      if (!template) {
        await ensureDefaultTemplates();
        template = await getEmailTemplate("contact_request");
      }
      const transport = await resolveMailTransport();
      const to =
        (template?.recipients ?? "").trim() || (transport?.fromAddress ?? "").trim();

      if (!to) {
        notified = "no_recipient_configured";
      } else {
        const result = await sendTemplatedEmail(
          "contact_request",
          {
            first_name,
            last_name: last_name || "",
            name: [first_name, last_name].filter(Boolean).join(" "),
            email,
            contact: contact || "",
            message,
            enquiry_id: String(enquiryId),
            site_name: domain.name ?? "",
          },
          { to },
        );
        notified = result.sent ? "sent" : result.reason;
      }
    } catch (mailError) {
      console.error("[API Contact] Enquiry saved but notification failed:", mailError);
      notified = "send_failed";
    }

    return NextResponse.json({ success: true, id: enquiryId, notified });
  } catch (error: any) {
    console.error("POST Error in contact API:", error);
    return NextResponse.json({ error: "Server error: " + error.message }, { status: 500 });
  }
}

