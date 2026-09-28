/**
 * Writes a value into an uncontrolled OR React-controlled field.
 *
 * Assigning `el.value = x` directly is not enough for anything React controls: React caches
 * the last value it wrote on the node and would treat the assignment as a no-op change, so
 * onChange never fires and the component's state (and anything rendered from it, like the hex
 * readout next to a colour swatch) would drift out of sync with what the input now shows.
 * Going through the prototype's own setter updates React's tracker too, so the dispatched
 * input/change events are seen as a genuine edit by both React and plain DOM listeners.
 *
 * Lives in its own module because two things now need it — SettingsForm's "Restore Defaults"
 * and the SEO tab's "Auto Generate" button — and a second copy is a second thing to fix the
 * next time React changes how it tracks input values.
 */
export function setFieldValue(element: Element, value: string) {
  if (element instanceof HTMLInputElement && (element.type === "checkbox" || element.type === "radio")) {
    const shouldCheck =
      element.type === "checkbox" ? value === "on" || value === "true" : element.value === value;
    const checkedSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "checked")?.set;
    if (checkedSetter) checkedSetter.call(element, shouldCheck);
    else element.checked = shouldCheck;
    element.dispatchEvent(new Event("click", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    return;
  }

  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  ) {
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), "value")?.set;
    if (setter) setter.call(element, value);
    else element.value = value;
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

/** Sets one named control (or every control sharing that name) inside a form. */
export function setNamedFieldValue(form: HTMLFormElement, name: string, value: string) {
  const found = form.elements.namedItem(name);
  if (!found) return;
  // namedItem returns a RadioNodeList when several controls share the name.
  const targets = found instanceof RadioNodeList ? Array.from(found) : [found];
  for (const target of targets) setFieldValue(target, value);
}
