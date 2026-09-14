import type { ReactNode } from "react";

/**
 * Tiny inline markup for the letters, so the prose stays plain text:
 *   [[Happy]]      a name, highlighted
 *   __like this__  underlined
 *   {{like this}}  coloured accent
 */
const TOKEN = /(\[\[.+?\]\]|__.+?__|\{\{.+?\}\})/g;

export function renderInline(text: string): ReactNode[] {
  return text.split(TOKEN).map((part, i) => {
    if (part.startsWith("[[") && part.endsWith("]]")) {
      return (
        <mark className="name" key={i}>
          {part.slice(2, -2)}
        </mark>
      );
    }
    if (part.startsWith("__") && part.endsWith("__")) {
      return (
        <span className="ul" key={i}>
          {part.slice(2, -2)}
        </span>
      );
    }
    if (part.startsWith("{{") && part.endsWith("}}")) {
      return (
        <span className="accent" key={i}>
          {part.slice(2, -2)}
        </span>
      );
    }
    return part;
  });
}
