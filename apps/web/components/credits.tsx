import type { ReactNode } from "react";

type Credit = { name: string; href: string; viewBox: string; mark: ReactNode };

const CREDITS: Credit[] = [
  {
    name: "flit.design",
    href: "https://flit.design",
    viewBox: "0 0 24 24",
    mark: (
      <path
        d="M17.5 11C15 11.5 12.4038 11.0493 11.5 10.5C12.8301 12.0378 14.8905 17.5 12.9807 20.7189C11.0709 23.9378 7.27751 20.4097 9.92143 13.5318C10.1192 12.8214 10.3741 11.9595 10.6581 11.0268C11.3205 8.85119 12.6082 4.23748 13.2289 2"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
      />
    ),
  },
  {
    name: "shadcn/ui",
    href: "https://ui.shadcn.com",
    viewBox: "0 0 24 24",
    mark: (
      <path d="M22.219 11.784 11.784 22.219c-.407.407-.407 1.068 0 1.476.407.407 1.068.407 1.476 0L23.695 13.26c.407-.408.407-1.069 0-1.476-.408-.407-1.069-.407-1.476 0ZM20.132.305.305 20.132c-.407.407-.407 1.068 0 1.476.408.407 1.069.407 1.476 0L21.608 1.781c.407-.407.407-1.068 0-1.476-.408-.407-1.069-.407-1.476 0Z" />
    ),
  },
  {
    name: "Radix UI",
    href: "https://www.radix-ui.com",
    viewBox: "0 0 24 24",
    mark: (
      <path d="M11.52 24a7.68 7.68 0 0 1-7.68-7.68 7.68 7.68 0 0 1 7.68-7.68V24Zm0-24v7.68H3.84V0h7.68Zm4.8 7.68a3.84 3.84 0 1 1 0-7.68 3.84 3.84 0 0 1 0 7.68Z" />
    ),
  },
  {
    name: "Motion",
    href: "https://motion.dev",
    viewBox: "0 -8 25.4 25",
    mark: (
      <path d="M 9.587 0 L 4.57 9 L 0 9 L 3.917 1.972 C 4.524 0.883 6.039 0 7.301 0 Z M 20.794 2.25 C 20.794 1.007 21.817 0 23.079 0 C 24.341 0 25.364 1.007 25.364 2.25 C 25.364 3.493 24.341 4.5 23.079 4.5 C 21.817 4.5 20.794 3.493 20.794 2.25 Z M 10.443 0 L 15.013 0 L 9.997 9 L 5.427 9 Z M 15.841 0 L 20.411 0 L 16.494 7.028 C 15.887 8.117 14.372 9 13.11 9 L 10.825 9 Z" />
    ),
  },
  {
    name: "Prisma",
    href: "https://www.prisma.io",
    viewBox: "0 0 24 24",
    mark: (
      <path d="M21.8068 18.2848L13.5528.7565c-.207-.4382-.639-.7273-1.1286-.7541-.5023-.0293-.9523.213-1.2062.6253L2.266 15.1271c-.2773.4518-.2718 1.0091.0158 1.4555l4.3759 6.7786c.2608.4046.7127.6388 1.1823.6388.1332 0 .267-.0188.3987-.0577l12.7019-3.7568c.3891-.1151.7072-.3904.8737-.7553s.1633-.7828-.0075-1.1454zm-1.8481.7519L9.1814 22.2242c-.3292.0975-.6448-.1873-.5756-.5194l3.8501-18.4386c.072-.3448.5486-.3996.699-.0803l7.1288 15.138c.1344.2856-.019.6224-.325.7128z" />
    ),
  },
  {
    name: "Zod",
    href: "https://zod.dev",
    viewBox: "0 0 24 24",
    mark: (
      <path d="M2.584 3.582a2.247 2.247 0 0 1 2.112-1.479h14.617c.948 0 1.794.595 2.115 1.487l2.44 6.777a2.248 2.248 0 0 1-.624 2.443l-9.61 8.52a2.247 2.247 0 0 1-2.963.018L.776 12.773a2.248 2.248 0 0 1-.64-2.467Zm12.038 4.887-9.11 5.537 5.74 5.007c.456.399 1.139.396 1.593-.006l5.643-5.001H14.4l6.239-3.957c.488-.328.69-.947.491-1.5l-1.24-3.446a1.535 1.535 0 0 0-1.456-1.015H5.545a1.535 1.535 0 0 0-1.431 1.01l-1.228 3.37z" />
    ),
  },
];

export function Credits() {
  return (
    <nav aria-label="Orodja, uporabljena v projektu" className="flex flex-col items-center gap-4">
      <p className="text-sm text-nav-foreground">Zgrajeno s pomočjo</p>
      <ul className="flex flex-wrap justify-center gap-x-6 gap-y-3">
        {CREDITS.map((c) => (
          <li key={c.name}>
            <a
              href={c.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-sm text-base font-medium text-nav-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              <svg viewBox={c.viewBox} fill="currentColor" aria-hidden className="size-[1.125rem] shrink-0">
                {c.mark}
              </svg>
              {c.name}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
