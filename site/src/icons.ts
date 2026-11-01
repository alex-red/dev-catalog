// Catalog glyphs: a shared 20-unit grid, open geometry and a 1.5-unit stroke.
// Shapes carry meaning independently of color; adjacent text supplies the label.
const paths: Record<string, string> = {
  script: "M3 4h14v12H3z M3 7h14 M6 10l2 2-2 2 M10.5 14H14",
  workflow: "M3 3.5h5v5H3z M12 11.5h5v5h-5z M8 6h5.5v3 M11.5 7.5l2 2 2-2 M6 8.5V14h6",
  tool: "M11 3a4.5 4.5 0 0 0-5 6L3 12a3 3 0 0 0 4 4l3-3a4.5 4.5 0 0 0 6-5l-3 3-4-4 3-3 M5 14.5l.5-.5",
  collection: "M3 6.5 10 3l7 3.5-7 3.5-7-3.5Z M3 10l7 3.5 7-3.5 M3 13.5l7 3.5 7-3.5",
  experimental: "M7 3h6 M8 3v5l-4.5 7a1.5 1.5 0 0 0 1.3 2h10.4a1.5 1.5 0 0 0 1.3-2L12 8V3 M6 12h8 M8 14.5h.01 M11 15h.01",
};

export function catalogIcon(kind: string): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 20 20");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.5");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.classList.add("catalog-icon");
  svg.dataset.kind = kind;
  const path = document.createElementNS(svg.namespaceURI, "path");
  path.setAttribute("d", paths[kind] ?? paths.collection);
  svg.append(path);
  return svg;
}
