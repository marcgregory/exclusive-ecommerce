/**
 * Reusable helper to determine if a navigation link is active based on the current pathname.
 * - Home ('/') requires an exact match.
 * - Other routes match exactly or if the current pathname is a nested route under the link href.
 */
export function isActive(pathname: string, href: string): boolean {
  if (href === '/') {
    return pathname === '/';
  }
  return pathname === href || pathname.startsWith(href + '/');
}
