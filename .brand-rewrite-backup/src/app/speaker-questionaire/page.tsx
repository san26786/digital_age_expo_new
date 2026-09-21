import Link from "next/link";
import { getDomain } from "@/lib/services/domain";
import { getEventById } from "@/lib/services/events";
import { getSpeakerById } from "@/lib/services/speakers";
import { getActiveAgendaVenues, getEventDateOptions } from "@/lib/services/schedule";
import { SpeakerQuestionnaireForm } from "@/components/speakers/SpeakerQuestionnaireForm";

export const metadata = {
  title: "Speaker Questionnaire - Digital Age Expo",
  description: "Complete your speaking profile, biography, session outline, and preferred slots for Digital Age Expo 2026.",
};

interface Props {
  searchParams: Promise<{ speaker_id?: string }>;
}

function InfoScreen({ title, message, showRegisterCta }: { title: string; message: string; showRegisterCta?: boolean }) {
  return (
    <div className="bg-slate-950 text-white min-h-screen flex items-center justify-center px-6 py-24">
      <div className="max-w-xl text-center space-y-6">
        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">{title}</h1>
        <p className="text-slate-300">{message}</p>
        {showRegisterCta && (
          <Link
            href="/speaker_registration"
            className="btn-brand-gradient inline-block rounded-full px-8 py-3.5 text-xs font-extrabold uppercase tracking-wider text-white shadow-xl transition hover:scale-105"
          >
            Go to Speaker Registration
          </Link>
        )}
      </div>
    </div>
  );
}

export default async function SpeakerQuestionnairePage({ searchParams }: Props) {
  const { speaker_id } = await searchParams;
  const domain = await getDomain();
  const event = domain.event_id ? await getEventById(domain.event_id) : null;

  if (!event) {
    return (
      <InfoScreen
        title="Speakers Questionnaire"
        message="No upcoming event is currently configured for this site."
      />
    );
  }

  const speakerId = speaker_id ? Number(speaker_id) : NaN;
  const speaker = !Number.isNaN(speakerId) ? await getSpeakerById(speakerId) : null;

  if (!speaker || speaker.event_id !== event.id) {
    return (
      <InfoScreen
        title="Speakers Questionnaire"
        message="We couldn't find a matching speaker registration. Please register as a speaker first — you'll be redirected here automatically with your speaker link."
        showRegisterCta
      />
    );
  }

  const [venues, dateOptions] = await Promise.all([
    getActiveAgendaVenues(event.id),
    getEventDateOptions(event.id),
  ]);

  return (
    <SpeakerQuestionnaireForm
      speakerId={speaker.id}
      initialValues={{
        first_name: speaker.first_name ?? "",
        last_name: speaker.last_name ?? "",
        email: speaker.email ?? "",
        phone: speaker.phone ?? "",
        description: speaker.description ?? "",
      }}
      venues={venues}
      dateOptions={dateOptions}
    />
  );
}
