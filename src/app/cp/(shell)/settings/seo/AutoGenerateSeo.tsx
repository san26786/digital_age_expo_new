"use client";

import { useRef } from "react";
import { AutoGenerateSeoButton } from "@/components/common/AutoGenerateSeoButton";
import { CP_SEO_VARNAME, SEO_FIELD_KEYS, type SeoFields } from "@/lib/seo/generate";
import { setNamedFieldValue } from "../_components/setFieldValue";

/**
 * The CP's adapter for the shared Auto Generate button.
 *
 * The SEO tab's inputs are UNCONTROLLED — the page is a Server Component and each field renders
 * with a `defaultValue`, so there is no React state to write a generated set into. This reaches
 * the fields the same way "Restore Defaults" does, through setNamedFieldValue, which goes via
 * React's own value setter so the form registers a real edit and its "Unsaved changes" notice
 * and Save button behave exactly as if the values had been typed.
 *
 * It finds the form by walking up from its own node rather than by id or a global query: this
 * component is rendered inside the form it edits, so `closest` is both the shortest path and the
 * one that cannot accidentally address a different form on the page.
 *
 * Props are plain strings because they cross the server/client boundary.
 */
export function AutoGenerateSeo(props: {
  siteName: string;
  brand?: string;
  link?: string;
  eventTitle?: string;
  eventDescription?: string;
  location?: string;
  dateStart?: string;
  dateEnd?: string;
}) {
  const anchor = useRef<HTMLDivElement>(null);

  const form = () => anchor.current?.closest("form") ?? null;

  const read = (key: keyof typeof CP_SEO_VARNAME): string => {
    const element = form()?.elements.namedItem(CP_SEO_VARNAME[key]);
    return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
      ? element.value
      : "";
  };

  return (
    <div ref={anchor}>
      <AutoGenerateSeoButton
        collect={() => ({
          ...props,
          // What is in the boxes right now wins over what the page was rendered with — an admin
          // who has just retyped the title expects the rest to follow that, not the saved row.
          currentTitle: read("metaTitle") || props.eventTitle || props.siteName,
          currentDescription: read("metaDescription") || props.eventDescription,
        })}
        snapshot={() =>
          Object.fromEntries(SEO_FIELD_KEYS.map((key) => [key, read(key)])) as SeoFields
        }
        apply={(fields) => {
          const target = form();
          if (!target) return;
          for (const key of SEO_FIELD_KEYS) {
            setNamedFieldValue(target, CP_SEO_VARNAME[key], fields[key]);
          }
        }}
      />
    </div>
  );
}
