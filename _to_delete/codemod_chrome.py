"""
Normalise Members-side component chrome onto the manage_awards_partner reference.

SAFETY CONTRACT: every rule below rewrites the *contents of a className string
literal* and nothing else. No rule touches an identifier, a prop name, an event
handler, an import or any expression, so running this cannot change behaviour —
only appearance. Rules are applied to a file only when the "when" predicate says
the file actually contains that construct.

Run with --apply to write; default is a dry-run report.
"""
import io, re, sys, glob, os
from collections import Counter

DRY = "--apply" not in sys.argv

REF_TABLE_HEAD_ROW = "border-b border-white/10 bg-gradient-to-r from-brand-purple to-brand-pink text-white"
REF_TH = "px-6 py-4 font-black uppercase tracking-wider"
REF_TABLE_WRAP = "glass-panel rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
REF_OVERLAY = "fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm p-4 animate-fade-in"
REF_INPUT = "w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-xs text-white focus:border-brand-pink focus:outline-none"
REF_LABEL = "block text-xs font-bold uppercase tracking-wider text-fuchsia-300 mb-1.5"
REF_BTN_ICON = "flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white transition"
REF_EMPTY = "px-6 py-12 text-center text-zinc-400 italic font-medium"

counts = Counter()


def sub(name, pattern, repl, src, flags=0):
    out, n = re.subn(pattern, repl, src, flags=flags)
    if n:
        counts[name] += n
    return out


def transform(src: str) -> str:
    # ---- 1. Table header bar --------------------------------------------------
    # Three shapes exist in the codebase: styling on <thead>, styling on the inner
    # <tr>, or both. All become the reference gradient bar on the <tr>, with the
    # <thead> left unstyled, so one rule describes the header everywhere.
    src = sub(
        "thead: styled -> plain + gradient tr",
        r'<thead className="(?![^"]*from-brand-purple)[^"]*">\s*\n(\s*)<tr(?: className="[^"]*")?>',
        lambda m: '<thead>\n' + m.group(1) + '<tr className="' + REF_TABLE_HEAD_ROW + '">',
        src,
    )
    src = sub(
        "thead tr -> gradient",
        r'(<thead>\s*\n\s*<tr className=")(?![^"]*from-brand-purple)[^"]*(">)',
        lambda m: m.group(1) + REF_TABLE_HEAD_ROW + m.group(2),
        src,
    )
    src = sub(
        "bare thead tr -> gradient",
        r'(<thead>\s*\n\s*)<tr>',
        lambda m: m.group(1) + '<tr className="' + REF_TABLE_HEAD_ROW + '">',
        src,
    )

    # ---- 2. Header cells ------------------------------------------------------
    # Preserve any alignment/width utility already on the cell; replace only the
    # padding and type treatment, which is what drifted.
    def th_repl(m):
        keep = [
            c for c in m.group(2).split()
            if c.startswith(("text-right", "text-center", "text-left", "w-", "min-w-", "max-w-", "whitespace-", "sticky", "left-", "hidden", "sm:", "md:", "lg:"))
        ]
        return m.group(1) + " ".join(REF_TH.split() + keep) + m.group(3)

    src = sub("th typography", r'(<th className=")([^"]*)(")', th_repl, src)

    # ---- 3. Modal overlay -----------------------------------------------------
    # Keeps `grid place-items-center overflow-y-auto`, which is what centres a
    # short modal while still letting a tall one scroll.
    src = sub(
        "modal overlay",
        r'"fixed inset-0 z-50 [^"]*bg-black/[0-9]+[^"]*"',
        '"' + REF_OVERLAY + '"',
        src,
    )

    # ---- 3b. Table scroll wrapper radius --------------------------------------
    # Only the corner radius is normalised here. The wrappers differ structurally
    # (some already sit inside a glass panel, some are the panel), so replacing the
    # whole class list would double up borders on the nested ones.
    src = sub(
        "table wrapper radius",
        r'"overflow-x-auto rounded-lg border border-white/10"',
        '"overflow-x-auto rounded-2xl border border-white/10"',
        src,
    )

    # ---- 4. Empty-state cell --------------------------------------------------
    src = sub(
        "table empty state",
        r'"px-6 py-12 text-center[^"]*"',
        '"' + REF_EMPTY + '"',
        src,
    )
    return src


targets = sorted(
    glob.glob("src/components/dashboard/*.tsx")
    + glob.glob("src/app/members/**/*.tsx", recursive=True)
)

changed = []
for f in targets:
    src = io.open(f, encoding="utf-8").read()
    out = transform(src)
    if out != src:
        changed.append(f)
        if not DRY:
            io.open(f, "w", encoding="utf-8", newline="\n").write(out)

print(("DRY RUN\n" if DRY else "") + f"{len(changed)} file(s) affected\n")
for k, v in counts.most_common():
    print(f"  {v:4d}  {k}")
print()
for f in changed:
    print("   ", f)
