/** Lados con contenido fuera de vista en un contenedor con scroll horizontal. */
export function scrollOverflowSides(
  scrollLeft: number,
  clientWidth: number,
  scrollWidth: number,
  epsilon = 1,
): { left: boolean; right: boolean } {
  const maxScroll = Math.max(0, scrollWidth - clientWidth);
  return {
    left: scrollLeft > epsilon,
    right: scrollLeft < maxScroll - epsilon,
  };
}
