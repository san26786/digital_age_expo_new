"""
Second page pass: the Members pages whose heading has no eyebrow strip.

Two shapes are handled.

  Variant A — a plain `<div className="space-y-2">` holding an <h1> and a <p>.
              Becomes the full reference frame: breadcrumb, glass panel, and a
              <MembersPageHeader> with the gradient icon tile.

  Variant B — an <h1>/<p> pair sitting in the left half of a
              `flex ... justify-between` row whose right half is already an
              action button. The row itself is the reference header row, so only
              the left cluster is rebuilt (icon tile + title + subtitle) and the
              row's own classes are normalised. The button is left exactly where
              it is — extracting balanced JSX to move it into an `actions` prop
              is not something a regex can do safely, and a misplaced button is a
              functional regression, not a styling one.

As with pass 1, this only rewrites heading MARKUP and className strings.
"""
import io, re, sys, glob, os

DRY = "--apply" not in sys.argv

SHELL_CLASS = "section-transition space-y-8 animate-fade-in text-white"
PANEL_CLASS = "glass-panel rounded-2xl p-8 shadow-2xl border border-white/10"
HEADER_ROW = "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6"
ICON_TILE = "flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-purple to-brand-pink shadow-lg shadow-brand-pink/20"
TITLE_CLS = "text-2xl sm:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-2"
SUB_CLS = "text-xs font-medium text-zinc-400 mt-1"

ICON_BY_DIR = {
    "event_about_us": "Info", "event_checklist": "ListChecks",
    "event_lobby_visitor_enquires": "MessageSquare", "event_member": "Users",
    "manage_speaker_slots": "CalendarClock", "user_index": "LayoutDashboard",
    "view_exhibitor": "Store", "manage_event_advertiser": "BadgeDollarSign",
    "manage_speakers": "Mic", "manage_event_artwork": "Image",
    "manage_event_content_request": "FileText", "manage_event_download": "Download",
    "manage_organiser_photos": "Camera", "manage_organiser_videos": "Video",
    "publication_contacts": "Contact", "view_exhibitor_information": "Store",
    "manage_stand_assets": "Package", "manage_speaker_questionaire": "ClipboardList",
    "manage_event_promotions": "Megaphone",
}

VARIANT_A = re.compile(
    r'(?P<indent>[ \t]*)<div className="space-y-2">\s*'
    r'<h1 className="[^"]*">(?P<title>[^<{]*)</h1>\s*'
    r'(?:<p className="[^"]*">(?P<desc>[^<]*?)</p>\s*)?'
    r'</div>',
    re.S,
)

VARIANT_B = re.compile(
    r'(?P<indent>[ \t]*)<div className="(?P<row>flex flex-col sm:flex-row[^"]*justify-between[^"]*)">\s*\n'
    r'(?P<i2>[ \t]*)<div>\s*'
    r'<h1 className="[^"]*">(?P<title>[^<{]*)</h1>\s*'
    r'(?:<p className="[^"]*">(?P<desc>[^<]*?)</p>\s*)?'
    r'</div>',
    re.S,
)

ROOT_RE = re.compile(r'(return \(\s*\n\s*<div className=")space-y-[68](">)')


def attr(v):
    v = " ".join(v.split())
    return '"' + v.replace('"', "&quot;") + '"'


def desc_prop(d):
    if not d or not d.strip():
        return None
    d = d.strip()
    if d.startswith("{") and d.endswith("}"):
        return "description={" + " ".join(d[1:-1].split()) + "}"
    if "<" in d or "{" in d:
        return None
    return "description=" + attr(d)


def ensure_import(src, statement, marker):
    if marker in src:
        return src
    lines = src.split("\n")
    last = -1
    for i, ln in enumerate(lines):
        if ln.startswith("import "):
            last = i
    lines.insert(last + 1 if last >= 0 else 0, statement)
    return "\n".join(lines)


def ensure_lucide(src, icon):
    m = re.search(r'import \{([^}]*)\} from "lucide-react";', src)
    if not m:
        return ensure_import(src, f'import {{ {icon} }} from "lucide-react";', "@@none@@")
    names = [n.strip() for n in m.group(1).split(",") if n.strip()]
    if icon in names:
        return src
    names.append(icon)
    return src[: m.start()] + "import { " + ", ".join(names) + ' } from "lucide-react";' + src[m.end():]


def transform(path):
    src = io.open(path, encoding="utf-8").read()
    if "MembersPageHeader" in src and "MembersBreadcrumb" in src:
        return None
    page_dir = os.path.basename(os.path.dirname(path))
    icon = ICON_BY_DIR.get(page_dir)
    used_shell = [False]
    used_icon = [False]

    def repl_a(m):
        ind = m.group("indent")
        title = " ".join(m.group("title").split())
        if not title:
            return m.group(0)
        used_shell[0] = True
        parts = ["title=" + attr(title)]
        dp = desc_prop(m.group("desc"))
        if dp:
            parts.append(dp)
        if icon:
            parts.append(f"icon={{{icon}}}")
            used_icon[0] = True
        attrs = ("\n" + ind + "    ").join(parts)
        return (
            f'{ind}<MembersBreadcrumb label={attr(title)} />\n\n'
            f'{ind}<div className="{PANEL_CLASS}">\n'
            f'{ind}  <MembersPageHeader\n'
            f'{ind}    {attrs}\n'
            f'{ind}  />\n'
            f'{ind}</div>'
        )

    def repl_b(m):
        ind, i2 = m.group("indent"), m.group("i2")
        title = " ".join(m.group("title").split())
        if not title:
            return m.group(0)
        desc = m.group("desc")
        icon_name = icon or "LayoutGrid"
        used_icon[0] = True
        sub = ""
        if desc and desc.strip() and "<" not in desc and "{" not in desc:
            sub = f'\n{i2}    <p className="{SUB_CLS}">{" ".join(desc.split())}</p>'
        elif desc and desc.strip().startswith("{"):
            sub = f'\n{i2}    <p className="{SUB_CLS}">{" ".join(desc.split())}</p>'
        return (
            f'{ind}<div className="{HEADER_ROW}">\n'
            f'{i2}<div className="flex items-center gap-4">\n'
            f'{i2}  <div className="{ICON_TILE}">\n'
            f'{i2}    <{icon_name} className="h-6 w-6 text-white" />\n'
            f'{i2}  </div>\n'
            f'{i2}  <div>\n'
            f'{i2}    <h1 className="{TITLE_CLS}">{title}</h1>{sub}\n'
            f'{i2}  </div>\n'
            f'{i2}</div>'
        )

    out, na = VARIANT_A.subn(repl_a, src)
    out, nb = VARIANT_B.subn(repl_b, out)
    if na == 0 and nb == 0:
        return None

    if used_shell[0]:
        out = ROOT_RE.sub(lambda m: m.group(1) + SHELL_CLASS + m.group(2), out)
        out = ensure_import(
            out,
            'import { MembersBreadcrumb, MembersPageHeader } from "@/components/ui/MembersPageShell";',
            "@/components/ui/MembersPageShell",
        )
    if used_icon[0]:
        out = ensure_lucide(out, icon or "LayoutGrid")
    return out, na, nb


SKIP = {"index", "register", "[slug]", "user_event_sumary"}

files = [
    f for f in sorted(glob.glob("src/app/members/**/page.tsx", recursive=True))
    if os.path.basename(os.path.dirname(f)) not in SKIP
]

changed = 0
for f in files:
    r = transform(f)
    if not r:
        continue
    out, na, nb = r
    changed += 1
    tag = f"A={na} B={nb}"
    if DRY:
        print(f"WOULD REWRITE {f}  ({tag})")
    else:
        io.open(f, "w", encoding="utf-8", newline="\n").write(out)
        print(f"rewrote {f}  ({tag})")
print(("DRY RUN — " if DRY else "") + f"{changed} file(s)")
