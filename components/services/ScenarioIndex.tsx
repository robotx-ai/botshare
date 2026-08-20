import Link from "next/link";
import Container from "@/components/Container";
import ScenarioCard from "./ScenarioCard";
import { SCENARIO_LIST } from "@/lib/serviceScenarios";
import { barlow } from "@/lib/fonts";

function ScenarioIndex() {
  return (
    <>
      <section
        aria-labelledby="services-heading"
        className="w-full bg-neutral-950 py-20 text-white sm:py-24"
      >
        <Container>
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-400">
              Hifivebot services
            </p>
            <h1
              id="services-heading"
              className={`${barlow.className} mt-4 text-5xl font-extrabold uppercase leading-none tracking-tight sm:text-6xl lg:text-7xl`}
            >
              Service Solutions
            </h1>
            <div className="mt-6 h-px w-16 bg-white/30" />
            <p className="mt-6 text-lg leading-relaxed text-neutral-300">
              Robot performance, interaction and supervised pilot services are
              organized across eight customer scenarios. Select a scenario to
              review its applicable settings, service capabilities and the
              packages bookable in your area.
            </p>
          </div>
        </Container>
      </section>

      <section aria-label="Service scenarios" className="w-full bg-white py-16 sm:py-20">
        <Container>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {SCENARIO_LIST.map((scenario) => (
              <ScenarioCard key={scenario.slug} scenario={scenario} />
            ))}
          </div>
        </Container>
      </section>

      <section className="w-full bg-neutral-100 py-16 sm:py-20">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <h2
              className={`${barlow.className} text-3xl font-extrabold uppercase tracking-tight text-neutral-900 sm:text-4xl`}
            >
              Service configuration and pricing
            </h2>
            <p className="mt-4 text-neutral-600">
              Each scenario lists the service packages available in its coverage
              areas. Multi-robot work, project production and custom development
              are quoted separately.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/robot-types"
                className="inline-flex items-center justify-center rounded-full bg-neutral-900 px-7 py-3 text-sm font-semibold text-white transition hover:bg-neutral-700"
              >
                Browse robot models
              </Link>
              <Link
                href="/services/private-events"
                className="inline-flex items-center gap-2 rounded-full border border-neutral-900 px-7 py-3 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-900 hover:text-white"
              >
                Start with Private Events
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}

export default ScenarioIndex;
