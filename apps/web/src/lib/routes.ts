/** All internal URL construction lives here so the shape can change in one place. */
export const comparePath = (a: string, b: string) => `/${a}/with-the-market-cap-of/${b}`;
export const hubPath = (a: string) => `/${a}`;
export const ogPath = (a: string, b: string) => `/og/${a}/${b}.png`;
export const coinsPath = () => '/coins';

export function absolute(path: string, origin: string): string {
  return new URL(path, origin).toString();
}
