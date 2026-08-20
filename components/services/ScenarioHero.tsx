import Image from "next/image";
import Link from "next/link";
import Container from "@/components/Container";
import type { ServiceScenario } from "@/lib/serviceScenarios";
import { barlow } from "@/lib/fonts";

type Props = {
  scenario: ServiceScenario;
  /** How many bookable service packages this scenario currently has. */
  packageCount: number;
  /** Lowest per-day price across those packages, if any. */
  fromPrice?: number;
};

function ScenarioHero({ scenario, packageCount, fromPrice }: Props) {
  const facts = [
    {
      term: "Starting from",
      detail: fromPrice ? `$${fromPrice.toLocaleString()}` : "On request",
      note: fromPrice ? "/ day" : undefined,
    },
    {
      term: "Packages",
      detail: String(packageCount),
      note: packageCount === 1 ? "service" : "services",
    },
    {
      term: "Crew",
      detail: "1 operator",
      note: "per active robot",
    },
  ];

  return (
    <section className="relative w-full overflow-hidden bg-neutral-950">
      <Image
        src={scenario.hero}
        alt={scenario.label}
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/75 to-neutral-950/35"
      />

      <Container>
        <div className="relative z-10 flex min-h-[26rem] flex-col justify-end py-16 text-white sm:min-h-[32rem] sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-300">
            <Link href="/services" className="transition hover:text-white">
              All services
            </Link>
          </p>

          <h1
            className={`${barlow.className} mt-5 max-w-4xl text-5xl font-extrabold uppercase leading-none tracking-tight sm:text-6xl lg:text-7xl`}
          >
            {scenario.label}
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-neutral-200">
            {scenario.lede}
          </p>

          <dl className="mt-10 flex flex-wrap gap-x-12 gap-y-6 border-t border-white/20 pt-6">
            {facts.map((fact) => (
              <div key={fact.term}>
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  {fact.term}
                </dt>
                <dd className="mt-2 flex items-baseline gap-1.5 text-2xl font-semibold">
                  {fact.detail}
                  {fact.note && (
                    <span className="text-sm font-normal text-neutral-400">
                      {fact.note}
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </Container>
    </section>
  );
}

export default ScenarioHero;
