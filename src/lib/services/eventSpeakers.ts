import { prisma } from "@/lib/prisma";
import type { EventMemberContext } from "@/lib/services/eventAccess";
import type { EventSpeakerInput, ChangeAmountInput } from "@/lib/validations/eventSpeaker";
import { getRoleEmailTemplates } from "@/lib/email/roleTemplates";

export interface SpeakerRow {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  workPhone: string | null;
  position: string | null;
  business: string | null;
  exhibitorUserId: string | null;
  linkedinUserProfile: string | null;
  facebookUrl: string | null;
  twitterUrl: string | null;
  instagramUrl: string | null;
  whatsappNo: string | null;
  zoomUrl: string | null;
  calendyUrl: string | null;
  youtubeUrl: string | null;
  pastEventYoutubeUrls: string | null;
  title: string | null;
  topicDescription: string | null;
  description: string | null;
  speakerHall: string | null;
  speakerTypePrice: number;
  speakerPrice: number;
  exchangeServices: boolean;
  exchangeAmount: number;
  discount: number;
  charitableAmount: number;
  videoType: string | null;
  meetingId: string | null;
  meetingPassword: string | null;
  videoLink: string | null;
  agendaId: number | null;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  keyNoteFlag: boolean;
  isBusinessSpeaker: boolean;
  isMasterclassSpeaker: boolean;
  isKeynoteSpeaker: boolean;
  isWebinarSpeaker: boolean;
  isSeminarSpeaker: boolean;
  isLiveWorkshopSpeaker: boolean;
  isVipSessionSpeaker: boolean;
  excludedFromAdvertise: boolean;
  hideHome: boolean;
  speakerGroup: string | null;
  speakerKeyword: string | null;
  whyExhibit: string | null;
  referralCode: string | null;
  status: string;
  joiningStatus: string | null;
}

export interface SpeakerStats {
  total: number;
  active: number;
  pending: number;
  reject: number;
}

function toRow(s: any): SpeakerRow {
  return {
    id: s.id,
    name: s.name ?? "",
    email: s.email,
    phone: s.phone,
    workPhone: s.work_phone,
    position: s.position,
    business: s.business,
    exhibitorUserId: s.exhibitor_user_id || null,
    linkedinUserProfile: s.linkedin_user_profile,
    facebookUrl: s.facebook_url,
    twitterUrl: s.twitter_url,
    instagramUrl: s.instagram_url,
    whatsappNo: s.whatsapp_no,
    zoomUrl: s.zoom_url,
    calendyUrl: s.calendy_url,
    youtubeUrl: s.youtube_url,
    pastEventYoutubeUrls: s.past_event_youtube_urls,
    title: s.title,
    topicDescription: s.topic_description,
    description: s.description,
    speakerHall: s.speaker_hall,
    speakerTypePrice: Number(s.speaker_type_price || 0),
    speakerPrice: Number(s.speaker_price || 0),
    exchangeServices: s.exchange_services === 1,
    exchangeAmount: Number(s.exchange_amount || 0),
    discount: Number(s.discount || 0),
    charitableAmount: Number(s.charitable_amount || 0),
    videoType: s.video_type,
    meetingId: s.meeting_id,
    meetingPassword: s.meeting_password,
    videoLink: s.video_link,
    agendaId: s.agenda_id,
    date: s.date ? new Date(s.date).toISOString().split("T")[0] : null,
    startTime: s.start_time ? new Date(s.start_time).toISOString().split("T")[1]?.slice(0, 5) || null : null,
    endTime: s.end_time ? new Date(s.end_time).toISOString().split("T")[1]?.slice(0, 5) || null : null,
    keyNoteFlag: s.key_note_flag === 1,
    isBusinessSpeaker: Boolean(s.is_business_speaker),
    isMasterclassSpeaker: Boolean(s.is_masterclass_speaker),
    isKeynoteSpeaker: Boolean(s.is_keynote_speaker),
    isWebinarSpeaker: Boolean(s.is_webinar_speaker),
    isSeminarSpeaker: Boolean(s.is_seminar_speaker),
    isLiveWorkshopSpeaker: Boolean(s.is_live_workshop_speaker),
    isVipSessionSpeaker: Boolean(s.is_vip_session_speaker),
    excludedFromAdvertise: Boolean(s.excluded_from_advertise),
    hideHome: s.hide_home === 1,
    speakerGroup: s.speaker_group,
    speakerKeyword: s.speaker_keyword,
    whyExhibit: s.why_exhibit,
    referralCode: s.referral_code,
    status: s.status,
    joiningStatus: s.joining_status,
  };
}

/** Mirrors members/manage_speakers.php's list — organiser-only speaker roster for this event. */
export async function getSpeakers(context: EventMemberContext, filterStatus?: string): Promise<SpeakerRow[]> {
  if (context.role !== "organiser") return [];
  const whereClause: any = { event_id: context.eventId };
  if (filterStatus && ["active", "pending", "reject"].includes(filterStatus)) {
    whereClause.status = filterStatus;
  }

  const rows = await prisma.find_speakers.findMany({
    where: whereClause,
    orderBy: { id: "desc" },
  });
  return rows.map(toRow);
}

export async function getSpeakerStats(context: EventMemberContext): Promise<SpeakerStats> {
  if (context.role !== "organiser") return { total: 0, active: 0, pending: 0, reject: 0 };
  const rows = await prisma.find_speakers.findMany({
    where: { event_id: context.eventId },
    select: { status: true },
  });

  const stats = { total: rows.length, active: 0, pending: 0, reject: 0 };
  for (const r of rows) {
    if (r.status === "active") stats.active++;
    else if (r.status === "pending") stats.pending++;
    else if (r.status === "reject") stats.reject++;
  }
  return stats;
}

function requiredLegacyDefaults() {
  const placeholderTime = new Date("1970-01-01T00:00:00Z");
  return {
    speaker_price: 0,
    profile_pic: "",
    date: new Date(),
    start_time: placeholderTime,
    end_time: placeholderTime,
  };
}

export async function createSpeaker(context: EventMemberContext, input: EventSpeakerInput) {
  if (context.role !== "organiser") return null;
  return prisma.find_speakers.create({
    data: {
      event_id: context.eventId,
      name: input.name,
      email: input.email || null,
      phone: input.phone || null,
      work_phone: input.work_phone || null,
      position: input.position || null,
      business: input.business || null,
      exhibitor_user_id: input.exhibitor_user_id || "",
      linkedin_user_profile: input.linkedin_user_profile || null,
      facebook_url: input.facebook_url || null,
      twitter_url: input.twitter_url || null,
      instagram_url: input.instagram_url || null,
      whatsapp_no: input.whatsapp_no || null,
      zoom_url: input.zoom_url || null,
      calendy_url: input.calendy_url || null,
      youtube_url: input.youtube_url || null,
      past_event_youtube_urls: input.past_event_youtube_urls || null,
      title: input.title,
      topic_description: input.topic_description || null,
      description: input.description || null,
      speaker_hall: input.speaker_hall || null,
      speaker_type_price: input.speaker_type_price || 0,
      video_type: input.video_type || null,
      meeting_id: input.meeting_id || null,
      meeting_password: input.meeting_password || null,
      video_link: input.video_link || null,
      agenda_id: input.agenda_id || null,
      exchange_services: input.exchange_services ? 1 : 0,
      exchange_amount: input.exchange_amount || 0,
      discount: input.discount || 0,
      charitable_amount: input.charitable_amount || 0,
      key_note_flag: input.key_note_flag ? 1 : 0,
      is_business_speaker: input.is_business_speaker,
      is_masterclass_speaker: input.is_masterclass_speaker,
      is_keynote_speaker: input.is_keynote_speaker,
      is_webinar_speaker: input.is_webinar_speaker,
      is_seminar_speaker: input.is_seminar_speaker,
      is_live_workshop_speaker: input.is_live_workshop_speaker,
      is_vip_session_speaker: input.is_vip_session_speaker,
      excluded_from_advertise: input.excluded_from_advertise,
      hide_home: input.hide_home ? 1 : 0,
      speaker_group: input.speaker_group || null,
      speaker_keyword: input.speaker_keyword || null,
      why_exhibit: input.why_exhibit || null,
      referral_code: input.referral_code || null,
      status: input.status,
      ...requiredLegacyDefaults(),
    },
    select: { id: true },
  });
}

export async function updateSpeaker(context: EventMemberContext, id: number, input: EventSpeakerInput) {
  if (context.role !== "organiser") return { count: 0 };
  return prisma.find_speakers.updateMany({
    where: { id, event_id: context.eventId },
    data: {
      name: input.name,
      email: input.email || null,
      phone: input.phone || null,
      work_phone: input.work_phone || null,
      position: input.position || null,
      business: input.business || null,
      exhibitor_user_id: input.exhibitor_user_id || "",
      linkedin_user_profile: input.linkedin_user_profile || null,
      facebook_url: input.facebook_url || null,
      twitter_url: input.twitter_url || null,
      instagram_url: input.instagram_url || null,
      whatsapp_no: input.whatsapp_no || null,
      zoom_url: input.zoom_url || null,
      calendy_url: input.calendy_url || null,
      youtube_url: input.youtube_url || null,
      past_event_youtube_urls: input.past_event_youtube_urls || null,
      title: input.title,
      topic_description: input.topic_description || null,
      description: input.description || null,
      speaker_hall: input.speaker_hall || null,
      speaker_type_price: input.speaker_type_price || 0,
      video_type: input.video_type || null,
      meeting_id: input.meeting_id || null,
      meeting_password: input.meeting_password || null,
      video_link: input.video_link || null,
      agenda_id: input.agenda_id || null,
      exchange_services: input.exchange_services ? 1 : 0,
      exchange_amount: input.exchange_amount || 0,
      discount: input.discount || 0,
      charitable_amount: input.charitable_amount || 0,
      key_note_flag: input.key_note_flag ? 1 : 0,
      is_business_speaker: input.is_business_speaker,
      is_masterclass_speaker: input.is_masterclass_speaker,
      is_keynote_speaker: input.is_keynote_speaker,
      is_webinar_speaker: input.is_webinar_speaker,
      is_seminar_speaker: input.is_seminar_speaker,
      is_live_workshop_speaker: input.is_live_workshop_speaker,
      is_vip_session_speaker: input.is_vip_session_speaker,
      excluded_from_advertise: input.excluded_from_advertise,
      hide_home: input.hide_home ? 1 : 0,
      speaker_group: input.speaker_group || null,
      speaker_keyword: input.speaker_keyword || null,
      why_exhibit: input.why_exhibit || null,
      referral_code: input.referral_code || null,
      status: input.status,
    },
  });
}

export async function deleteSpeaker(context: EventMemberContext, id: number) {
  if (context.role !== "organiser") return { count: 0 };
  return prisma.find_speakers.deleteMany({ where: { id, event_id: context.eventId } });
}

export async function bulkUpdateSpeakerStatus(
  context: EventMemberContext,
  ids: number[],
  status: "active" | "pending" | "reject"
) {
  if (context.role !== "organiser" || ids.length === 0) return { count: 0 };
  return prisma.find_speakers.updateMany({
    where: { id: { in: ids }, event_id: context.eventId },
    data: { status },
  });
}

export async function bulkDeleteSpeakers(context: EventMemberContext, ids: number[]) {
  if (context.role !== "organiser" || ids.length === 0) return { count: 0 };
  return prisma.find_speakers.deleteMany({
    where: { id: { in: ids }, event_id: context.eventId },
  });
}

export async function changeSpeakerAmount(
  context: EventMemberContext,
  id: number,
  input: ChangeAmountInput
) {
  if (context.role !== "organiser") return { count: 0 };
  return prisma.find_speakers.updateMany({
    where: { id, event_id: context.eventId },
    data: {
      discount: input.discount,
      charitable_amount: input.charitable_amount,
      exchange_amount: input.exchange_amount,
    },
  });
}

export async function importSpeakersFromCSV(
  context: EventMemberContext,
  rows: Array<{
    firstName?: string;
    lastName?: string;
    name?: string;
    position?: string;
    business?: string;
    email?: string;
    phone?: string;
    workPhone?: string;
  }>
) {
  if (context.role !== "organiser") return { imported: 0 };
  let imported = 0;

  for (const r of rows) {
    const fullName = r.name || `${r.firstName || ""} ${r.lastName || ""}`.trim();
    if (!fullName && !r.email) continue;

    const existing = r.email
      ? await prisma.find_speakers.findFirst({
          where: { event_id: context.eventId, email: r.email },
          select: { id: true },
        })
      : null;

    if (existing) {
      await prisma.find_speakers.update({
        where: { id: existing.id },
        data: {
          name: fullName || undefined,
          first_name: r.firstName || undefined,
          last_name: r.lastName || undefined,
          position: r.position || undefined,
          business: r.business || undefined,
          phone: r.phone || undefined,
          work_phone: r.workPhone || undefined,
        },
      });
    } else {
      await prisma.find_speakers.create({
        data: {
          event_id: context.eventId,
          name: fullName || "Imported Speaker",
          first_name: r.firstName || null,
          last_name: r.lastName || null,
          email: r.email || null,
          position: r.position || null,
          business: r.business || null,
          phone: r.phone || null,
          work_phone: r.workPhone || null,
          title: "Session Speaker",
          status: "pending",
          ...requiredLegacyDefaults(),
        },
      });
    }
    imported++;
  }

  return { imported };
}

export interface SpeakerEmailTemplateOption {
  id: string;
  label: string;
  processName: string | null;
}

/**
 * Feeds the speakers send-mail dropdown.
 *
 * Added alongside the route it serves: visitors, exhibitors and sponsors each had one of these
 * and speakers did not, so speakers were the one role an organiser could not mail from the
 * admin. The list itself comes from lib/email/roleTemplates.ts, shared by all four.
 */
export async function getSpeakerEmailTemplates(): Promise<SpeakerEmailTemplateOption[]> {
  const options = await getRoleEmailTemplates("speaker");
  return options.map((option) => ({
    id: option.id,
    label: option.label,
    processName: option.processName,
  }));
}
