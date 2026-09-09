"use client";

import { useMemo, useState } from "react";

export type EventSeriesTemplate = {
  id: string;
  name: string;
  default_title: string | null;
  default_subtitle: string | null;
  default_short_description: string | null;
  default_description: string | null;
  default_image_url: string | null;
  default_capacity: number | null;
  default_ticket_name: string | null;
  default_ticket_description: string | null;
  default_ticket_price_pence: number | null;
};

type Props = {
  templates: EventSeriesTemplate[];
  initialSeriesName?: string | null;
  duplicateMode?: boolean;
};

function setFormValue(form: HTMLFormElement | null, name: string, value: string) {
  if (!form) return;
  const field = form.elements.namedItem(name);
  if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) {
    field.value = value;
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

export function EventSeriesTemplateSelector({ templates, initialSeriesName = null, duplicateMode = false }: Props) {
  const initial = initialSeriesName
    ? templates.find((template) => template.name.toLowerCase() === initialSeriesName.toLowerCase())?.id ?? "new"
    : "one-off";
  const [choice, setChoice] = useState(initial);
  const [newSeriesName, setNewSeriesName] = useState(initial === "new" ? initialSeriesName ?? "" : "");
  const selected = useMemo(() => templates.find((template) => template.id === choice) ?? null, [choice, templates]);

  function applyTemplate(select: HTMLSelectElement, template: EventSeriesTemplate) {
    const form = select.form;
    setFormValue(form, "title", template.default_title ?? template.name);
    setFormValue(form, "subtitle", template.default_subtitle ?? "");
    setFormValue(form, "short_description", template.default_short_description ?? "");
    setFormValue(form, "description", template.default_description ?? "");
    setFormValue(form, "capacity", String(template.default_capacity ?? 20));
    setFormValue(form, "ticket_name", template.default_ticket_name ?? "General admission");
    setFormValue(form, "ticket_description", template.default_ticket_description ?? "");
    setFormValue(form, "ticket_price", ((template.default_ticket_price_pence ?? 0) / 100).toFixed(2));
    window.dispatchEvent(new CustomEvent("event-series-template-image", { detail: { imageUrl: template.default_image_url ?? "" } }));
  }

  function clearTemplate(select: HTMLSelectElement) {
    const form = select.form;
    for (const name of ["title", "subtitle", "short_description", "description", "ticket_description"]) setFormValue(form, name, "");
    setFormValue(form, "capacity", "20");
    setFormValue(form, "ticket_name", "General admission");
    setFormValue(form, "ticket_price", "0.00");
    window.dispatchEvent(new CustomEvent("event-series-template-image", { detail: { imageUrl: "" } }));
  }

  return (
    <div className="rounded-xl border border-black/10 bg-[#faf7f3] p-4">
      <label className="block text-sm font-semibold">
        Event type
        <select
          value={choice}
          onChange={(event) => {
            const next = event.target.value;
            setChoice(next);
            if (next === "one-off") {
              setNewSeriesName("");
              if (!duplicateMode) clearTemplate(event.target);
              return;
            }
            if (next === "new") {
              setNewSeriesName("");
              if (!duplicateMode) clearTemplate(event.target);
              return;
            }
            const template = templates.find((item) => item.id === next);
            if (template) applyTemplate(event.target, template);
          }}
          className="mt-1 w-full rounded-lg border bg-white px-3 py-2 font-normal"
        >
          <option value="one-off">One-off event — start from scratch</option>
          <optgroup label="Existing event series">
            {templates.map((template) => (
              <option key={template.id} value={template.id}>{template.name}</option>
            ))}
          </optgroup>
          <option value="new">Create a new event series…</option>
        </select>
      </label>

      {choice === "new" ? (
        <label className="mt-3 block text-sm font-medium">
          New series name
          <input
            name="series_name"
            required
            value={newSeriesName}
            onChange={(event) => setNewSeriesName(event.target.value)}
            placeholder="e.g. Poetry & Pour"
            className="mt-1 w-full rounded-lg border bg-white px-3 py-2 font-normal"
          />
        </label>
      ) : (
        <input type="hidden" name="series_name" value={selected?.name ?? ""} />
      )}

      <p className="mt-2 text-xs text-foreground/60">
        {selected
          ? `Using ${selected.name} defaults. Date/time stays blank and you can change any populated field for this occurrence.`
          : choice === "new"
            ? "Create the first event normally. Its content, image, capacity and ticket setup become the starting defaults for future dates in this series."
            : "Use this for an event that does not belong to a recurring series."}
      </p>
    </div>
  );
}
