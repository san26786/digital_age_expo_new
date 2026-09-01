"use client";

import { useMemo, useState, useEffect } from "react";
import { Calendar, Clock, Search } from "lucide-react";
import type { EventMeetingRow } from "@/lib/services/eventMeetings";
import type { EventRole } from "@/lib/services/eventAccess";
import { TablePagination } from "@/components/dashboard/TablePagination";

const PAGE_SIZE = 20;

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });

interface Props {
  meetings: EventMeetingRow[];
  role: EventRole;
}

export function EventMeetingsTable({ meetings, role }: Props) {
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return meetings;
    return meetings.filter(
      (m) =>
        (m.exhibitorName && m.exhibitorName.toLowerCase().includes(q)) ||
        (m.attendeeName && m.attendeeName.toLowerCase().includes(q))
    );
  }, [meetings, keyword]);

  useEffect(() => {
    setPage(1);
  }, [keyword]);

  const paged = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  return (
    <div className="space-y-6">
      {meetings.length > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 shadow-xl backdrop-blur-md">
          <Search className="h-5 w-5 shrink-0 text-brand-pink" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={role === "exhibitor" ? "Search by attendee name…" : "Search by exhibitor or attendee name…"}
            className="w-full bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none font-medium"
          />
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-md">
        {filtered.length === 0 ? (
          <div className="px-6 py-20 text-center">
            <p className="text-zinc-500 font-medium italic">
              {meetings.length === 0 ? "No meetings have been booked yet." : "No meetings match your search."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-gradient-to-r from-brand-purple to-brand-pink text-white">
                  <th className="px-6 py-4 font-black uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 font-black uppercase tracking-wider">Time</th>
                  {role !== "exhibitor" && <th className="px-6 py-4 font-black uppercase tracking-wider">Exhibitor</th>}
                  <th className="px-6 py-4 font-black uppercase tracking-wider">Attendee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paged.map((meeting) => (
                  <tr key={meeting.id} className="align-top hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-5">
                      <span className="inline-flex items-center gap-2 text-zinc-200 font-bold">
                        <Calendar className="h-4 w-4 text-brand-pink" />
                        {DATE_FORMAT.format(new Date(meeting.meetingDate))}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="inline-flex items-center gap-2 text-zinc-200 font-bold">
                        <Clock className="h-4 w-4 text-brand-purple" />
                        {meeting.meetingTime}
                      </span>
                    </td>
                    {role !== "exhibitor" && <td className="px-6 py-5 text-zinc-300 font-medium">{meeting.exhibitorName || "—"}</td>}
                    <td className="px-6 py-5 text-zinc-300 font-medium">{meeting.attendeeName || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <TablePagination currentPage={page} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} className="px-6 pb-6" />
      </div>
    </div>
  );
}
