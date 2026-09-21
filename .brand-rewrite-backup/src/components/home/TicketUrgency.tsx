import { CountdownTimer } from "@/components/home/CountdownTimer";
import { staticAssetUrl } from "@/lib/assets";

interface Props {
  title: string;
  subtext: string;
  eventName: string;
  targetDate: string;
}

export function TicketUrgency({ title, subtext, eventName, targetDate }: Props) {
  return (
    <section
      className="relative overflow-hidden bg-cover bg-center bg-no-repeat px-6 py-20 text-center text-white border-y border-white/10"
      style={{
        backgroundImage: `url('${staticAssetUrl("https://digitalageexpo.com/images/croped_hurry.jpg")}')`,
      }}
    >
      {/* Subtle backdrop overlay for clear text contrast over the image */}
      <div className="absolute inset-0 bg-slate-950/40 pointer-events-none" />
      <div className="relative z-10 mx-auto max-w-4xl">
        <h2 className="text-3xl font-black sm:text-4xl tracking-tight text-white drop-shadow-md">
          {title}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-white text-sm sm:text-base leading-relaxed drop-shadow-sm font-medium">
          {subtext.replace("DIGITAL AGE EXPO", eventName)}
        </p>
        <div className="mt-8">
          <CountdownTimer targetDate={targetDate} />
        </div>
      </div>
    </section>
  );
}
