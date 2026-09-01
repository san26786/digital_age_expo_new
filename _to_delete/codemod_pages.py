"""
Bring Members pages onto the /members/manage_awards_partner page frame.

Scope guard: this script only ever rewrites JSX MARKUP for the page heading — the
eyebrow/h1/description block — and the class string on the page's root <div>. It
never touches imports of services, data fetching, props passed to managers, or
any expression, so it cannot change what a page does.
"""
import io, re, sys, glob, os

DRY = "--apply" not in sys.argv
ONLY = None
for a in sys.argv[1:]:
    if a.startswith("--only="):
        ONLY = a.split("=", 1)[1]

SHELL_CLASS = "section-transition space-y-8 animate-fade-in text-white"
PANEL_CLASS = "glass-panel rounded-2xl p-8 shadow-2xl border border-white/10"

# A lucide icon per page, so the gradient tile says something about the screen
# rather than repeating one generic glyph 47 times.
ICON_BY_DIR = {
    "event_details": "CalendarDays", "event_faq": "HelpCircle",
    "event_magazine_setup": "BookOpen", "event_notifications": "Bell",
    "event_show_info": "Info", "event_sponsorship_setup": "Handshake",
    "event_ticket": "Ticket", "event_ticket_buyers": "Receipt",
    "event_todo_list": "ListChecks", "event_tradestand_setup": "Store",
    "leadership_board": "Trophy", "view_industry_list": "Factory",
    "view_sponsor": "Handshake", "view_visitor": "Users",
    "view_exhibitor": "Store", "view_speaker": "Mic",
    "event_lobby_agenda_items": "CalendarClock", "event_lobby_templates": "LayoutTemplate",
    "manage_registration": "ClipboardList", "team_members": "UsersRound",
    "event_promotions": "Megaphone", "event_schedule": "CalendarRange",
    "advertisers": "BadgeDollarSign", "banner_stands": "Flag",
    "meetings": "CalendarCheck", "news_feed": "Newspaper",
    "checklist": "ListChecks", "marketing_tools": "Megaphone",
}

HEADER_RE = re.compile(
    r'(?P<indent>[ \t]*)<div className="space-y-2">\s*'
    r'<div className="flex items-center gap-2">\s*'
    r'<div className="h-px w-8 bg-brand-pink" />\s*'
    r'<p className="text-\[10px\] font-black uppercase tracking-\[0\.3em\] text-brand-pink">(?P<eyebrow>[^<{]*)</p>\s*'
    r'</div>\s*'
    r'<h1 className="[^"]*">(?P<title>[^<{]*)</h1>\s*'
    r'(?:<p className="[^"]*">(?P<desc>[^<]*?)</p>\s*)?'
    r'</div>',
    re.S,
)

ROOT_RE = re.compile(r'(return \(\s*\n\s*<div className=")space-y-8(">)')


def jsx_attr(value: str) -> str:
    """Emit a JSX string attribute, escaping only what has to be escaped."""
    v = " ".join(value.split())
    if '"' in v:
        return "{" + repr(v).replace("'", '"', 0) + "}" if False else '{"' + v.replace('"', '\\"') + '"}'
    return '"' + v + '"'


def ensure_import(src: str, statement: str, marker: str) -> str:
    if marker in src:
        return src
    lines = src.split("\n")
    last = -1
    for i, ln in enumerate(lines):
        if ln.startswith("import ") or (last >= 0 and ln.startswith(" ") and lines[last].rstrip().endswith(("{", ","))):
            last = i
    insert_at = last + 1 if last >= 0 else 0
    lines.insert(insert_at, statement)
    return "\n".join(lines)


def ensure_lucide(src: str, icon: str) -> str:
    m = re.search(r'import \{([^}]*)\} from "lucide-react";', src)
    if not m:
        return ensure_import(src, f'import {{ {icon} }} from "lucide-react";', "@@never@@")
    names = [n.strip() for n in m.group(1).split(",") if n.strip()]
    if icon in names:
        return src
    names.append(icon)
    return src[: m.start()] + 'import { ' + ", ".join(names) + ' } from "lucide-react";' + src[m.end():]


def transform(path: str):
    src = io.open(path, encoding="utf-8").read()
    if not HEADER_RE.search(src):
        return None

    page_dir = os.path.basename(os.path.dirname(path))
    icon = ICON_BY_DIR.get(page_dir)

    def repl(m):
        ind = m.group("indent")
        title = " ".join(m.group("title").split())
        eyebrow = " ".join(m.group("eyebrow").split())
        desc = m.group("desc")
        parts = [f'title={jsx_attr(title)}']
        if desc and desc.strip():
            d = desc.strip()
            if d.startswith("{") and d.endswith("}"):
                # Already a JSX expression (e.g. a canManage ternary) — pass it through
                # untouched. Re-quoting it as a string would render the source code.
                parts.append("description={" + " ".join(d[1:-1].split()) + "}")
            elif "<" not in d and "{" not in d:
                parts.append("description=" + jsx_attr(d))
        if icon:
            parts.append(f"icon={{{icon}}}")
        if eyebrow:
            parts.append(f'pill={jsx_attr(eyebrow)}')
        attrs = ("\n" + ind + "    ").join(parts)
        return (
            f'{ind}<MembersBreadcrumb label={jsx_attr(title)} />\n\n'
            f'{ind}<div className="{PANEL_CLASS}">\n'
            f'{ind}  <MembersPageHeader\n'
            f'{ind}    {attrs}\n'
            f'{ind}  />\n'
            f'{ind}</div>'
        )

    out, n = HEADER_RE.subn(repl, src)
    out = ROOT_RE.sub(lambda m: m.group(1) + SHELL_CLASS + m.group(2), out)
    out = ensure_import(
        out,
        'import { MembersBreadcrumb, MembersPageHeader } from "@/components/ui/MembersPageShell";',
        "@/components/ui/MembersPageShell",
    )
    if icon:
        out = ensure_lucide(out, icon)
    return out, n


files = sorted(glob.glob("src/app/members/**/page.tsx", recursive=True))
if ONLY:
    files = [f for f in files if ONLY in f]

changed = 0
for f in files:
    r = transform(f)
    if not r:
        continue
    out, n = r
    changed += 1
    if DRY:
        print(f"WOULD REWRITE {f}  ({n} header block(s))")
    else:
        io.open(f, "w", encoding="utf-8", newline="\n").write(out)
        print(f"rewrote {f}  ({n} header block(s))")
print(("DRY RUN — " if DRY else "") + f"{changed} file(s)")
