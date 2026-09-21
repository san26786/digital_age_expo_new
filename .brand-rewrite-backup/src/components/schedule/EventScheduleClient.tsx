"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Calendar, MapPin, Clock, Filter, Sparkles, Search } from "lucide-react";
import { assetUrl } from "@/lib/assets";
import { speakerSlug } from "@/lib/slug";
import type { ScheduleDay } from "@/lib/services/schedule";

interface EventScheduleClientProps {
  event: {
    id: number;
    title: string;
    venue: string | null;
    date_start: Date | null;
    date_end: Date | null;
  };
  initialDays: ScheduleDay[];
}

const ZONE_TYPES = [
  { id: "all", label: "All" },
  { id: "masterclass_speaker", label: "Master Class" },
  { id: "keynote_speaker", label: "Keynote Sessions" },
  { id: "webinar_speaker", label: "Webinar" },
  { id: "seminar_speaker", label: "Seminar" },
  { id: "live_workshop_speaker", label: "Live Workshop" },
  { id: "vip_session_speaker", label: "VIP Session" },
];

export function EventScheduleClient({ event, initialDays }: EventScheduleClientProps) {
  const [activeHall, setActiveHall] = useState("all");
  const [activeZone, setActiveZone] = useState("all");
  const [activeDayIndex, setActiveDayIndex] = useState(0);

  // Default 3 days definition matching the requested schedule layout
  const defaultDays = [
    {
      id: "date_1",
      dayTitle: "Day 1",
      dateLabel: "August 26, 2026",
      subtitle: "Event Start Day",
      dateKey: "2026-08-26",
    },
    {
      id: "date_2",
      dayTitle: "Day 2",
      dateLabel: "August 27, 2026",
      subtitle: "Mid Event Day",
      dateKey: "2026-08-27",
    },
    {
      id: "date_3",
      dayTitle: "Day 3",
      dateLabel: "August 28, 2026",
      subtitle: "Event Closure Day",
      dateKey: "2026-08-28",
    },
  ];

  // Merge loaded days from database with default day structure
  const days = defaultDays.map((defDay, idx) => {
    const loadedDay = initialDays[idx];
    return {
      ...defDay,
      slots: loadedDay?.slots || [],
    };
  });

  const currentDay = days[activeDayIndex] || days[0];

  // Filter slots by activeZone
  const filteredSlots = currentDay.slots.filter((slot) => {
    if (activeZone === "all") return true;
    const agendaLower = (slot.agendaName || "").toLowerCase();
    const zoneLower = activeZone.replace("_speaker", "").replace("_", " ");
    return agendaLower.includes(zoneLower);
  });

  return (
    <div className="w-full bg-slate-950 text-white min-h-screen pb-20">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-b from-purple-950 via-slate-950 to-slate-950 px-6 py-16 text-center border-b border-white/10">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-fuchsia-500/20 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-fuchsia-300 border border-fuchsia-500/30">
            <Calendar className="w-4 h-4" />
            <span>Official Event Agenda</span>
          </div>

          <h1 className="text-3xl sm:text-6xl font-black uppercase tracking-tight text-white leading-none">
            {event.title || "Digital Age Expo 2026"} <span className="brand-gradient-text">Schedule</span>
          </h1>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs sm:text-sm text-slate-300 font-semibold pt-2">
            <span className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full">
              <Calendar className="w-4 h-4 text-fuchsia-400" />
              August 26 - 28, 2026
            </span>
            <span className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full">
              <MapPin className="w-4 h-4 text-fuchsia-400" />
              {event.venue || "Exhibition Lobby & Auditoriums"}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 space-y-8">
        {/* Hall Filter Row */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400 tracking-wider">
            <Filter className="w-3.5 h-3.5 text-fuchsia-400" />
            <span>Exhibition Hall Filter</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveHall("all")}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border cursor-pointer ${
                activeHall === "all"
                  ? "btn-brand-gradient text-white border-fuchsia-500 shadow-lg"
                  : "bg-slate-900/80 text-slate-300 border-white/10 hover:bg-slate-800"
              }`}
            >
              All Halls
            </button>
          </div>
        </div>

        <div className="h-px bg-white/10" />

        {/* Zone Filter Row */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400 tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
            <span>Session Type Filter</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {ZONE_TYPES.map((zone) => (
              <button
                key={zone.id}
                type="button"
                onClick={() => setActiveZone(zone.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border cursor-pointer ${
                  activeZone === zone.id
                    ? "btn-brand-gradient text-white border-fuchsia-500 shadow-lg"
                    : "bg-slate-900/80 text-slate-300 border-white/10 hover:bg-slate-800"
                }`}
              >
                {zone.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date Tabs Header */}
        <div className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {days.map((day, idx) => {
              const isActive = activeDayIndex === idx;
              return (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => setActiveDayIndex(idx)}
                  className={`text-left p-5 rounded-2xl border transition-all duration-300 cursor-pointer ${
                    isActive
                      ? "bg-gradient-to-r from-fuchsia-950/90 via-slate-900 to-indigo-950/90 border-fuchsia-500 shadow-2xl ring-2 ring-fuchsia-500/50"
                      : "bg-slate-900/60 border-white/10 hover:border-white/30 hover:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-widest text-fuchsia-400">
                      {day.dayTitle} - {day.dateLabel}
                    </span>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">
                      {day.subtitle}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-white mt-2 uppercase tracking-tight">
                    {day.dayTitle} ({day.dateLabel})
                  </h3>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content Display */}
        <div className="rounded-3xl border border-white/15 bg-slate-900/80 p-6 sm:p-10 shadow-2xl backdrop-blur-md min-h-[250px] flex flex-col justify-center">
          {filteredSlots.length > 0 ? (
            <div className="space-y-4 w-full">
              {filteredSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 p-5 rounded-2xl border border-white/10 bg-slate-950/60 hover:border-fuchsia-500/40 transition-all"
                >
                  <div className="flex items-center gap-3 text-xs font-bold text-fuchsia-400 bg-fuchsia-500/10 px-3.5 py-2 rounded-xl border border-fuchsia-500/20 shrink-0">
                    <Clock className="w-4 h-4" />
                    <span>
                      {slot.startTime} - {slot.endTime}
                    </span>
                  </div>

                  <div className="flex-1 space-y-1">
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/10 text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                      {slot.agendaName || "General Session"}
                    </span>
                    <h4 className="text-base font-bold text-white leading-snug">{slot.title}</h4>
                    {slot.description && (
                      <p className="text-xs text-slate-400 line-clamp-2">{slot.description}</p>
                    )}
                  </div>

                  {slot.speakerId && slot.speakerName && (
                    <Link
                      href={`/speaker/${speakerSlug(slot.speakerName, slot.speakerId)}`}
                      className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10 hover:border-fuchsia-500/50 transition-all sm:w-64 shrink-0"
                    >
                      <img
                        src={assetUrl(slot.speakerProfilePic) ?? "/no-image.jpg"}
                        alt={slot.speakerName}
                        className="w-10 h-10 rounded-full object-cover border border-fuchsia-500/40 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{slot.speakerName}</p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {slot.speakerPosition} {slot.speakerBusiness ? `• ${slot.speakerBusiness}` : ""}
                        </p>
                      </div>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto border border-white/10">
                <Search className="w-8 h-8" />
              </div>
              <p className="text-lg font-bold text-slate-200">No records found</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto font-medium">
                No speaker sessions are scheduled for {currentDay.dayTitle} ({currentDay.dateLabel}) under this filter.
              </p>
              <div className="pt-2">
                <Link
                  href="/speaker_registration"
                  className="btn-brand-gradient inline-flex items-center gap-2 rounded-xl px-6 py-3 text-xs font-extrabold uppercase tracking-wider text-white shadow-lg transition hover:scale-105"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Register As A Speaker</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
