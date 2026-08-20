import Image from "next/image";
import Link from "next/link";
import Container from "@/components/Container";
import { relatedScenarios, type ServiceScenario } from "@/lib/serviceScenarios";
import { barlow } from "@/lib/fonts";

type Props = {
  scenario: ServiceScenario;
};

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className={`${barlow.className} text-3xl font-extrabold uppercase tracking-tight text-neutral-900 sm:text-4xl`}
    >
      {children}
    </h2>
  );
}

function ScenarioDetail({ scenario }: Props) {
  const related = relatedScenarios(scenario.slug);

  return (
    <>
      <section className="w-full bg-white py-16 sm:py-20">
        <Container>
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div>
              <SectionHeading>Solution overview</SectionHeading>
              <div className="mt-6 flex flex-col gap-5">
                {scenario.overview.map((paragraph) => (
                  <p
                    key={paragraph.slice(0, 40)}
                    className="text-base leading-relaxed text-neutral-600"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                Applicable settings
              </h3>
              <ul className="mt-5 flex flex-wrap gap-2">
                {scenario.settings.map((setting) => (
                  <li
                    key={setting}
                    className="rounded-full border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm text-neutral-700"
                  >
                    {setting}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      <section className="w-full bg-neutral-100 py-16 sm:py-20">
        <Container>
          <SectionHeading>Standard service content</SectionHeading>
          <p className="mt-4 max-w-2xl text-neutral-600">
            The standard service is limited to the modules below. Their order
            and timing can change; the service content does not extend past
            them.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
            {scenario.modules.map((module) => (
              <article
                key={module}
                className="rounded-2xl border border-neutral-200 bg-white p-6"
              >
                <p className="text-base font-semibold leading-snug text-neutral-900">
                  {module}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-14">
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Typical service flow
            </h3>
            <ol className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {scenario.flow.map((step, index) => (
                <li
                  key={step}
                  className="flex flex-col gap-3 border-t-2 border-neutral-900 pt-4"
                >
                  <span
                    className={`${barlow.className} text-3xl font-bold leading-none text-neutral-400`}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="text-sm leading-relaxed text-neutral-700">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </section>

      {scenario.gallery.length > 0 && (
        <section className="w-full bg-neutral-950 py-16 text-white sm:py-20">
          <Container>
            <h2
              className={`${barlow.className} max-w-3xl text-3xl font-extrabold uppercase tracking-tight sm:text-4xl`}
            >
              {scenario.galleryTitle}
            </h2>

            <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {scenario.gallery.map((shot) => (
                <figure key={shot.src} className="flex flex-col gap-4">
                  <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-neutral-800">
                    <Image
                      src={shot.src}
                      alt={shot.title}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                  <figcaption>
                    <h3 className="text-base font-semibold text-white">
                      {shot.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-neutral-400">
                      {shot.caption}
                    </p>
                  </figcaption>
                </figure>
              ))}
            </div>
          </Container>
        </section>
      )}

      <section className="w-full bg-white py-16 sm:py-20">
        <Container>
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div>
              <SectionHeading>Optional project services</SectionHeading>
              <p className="mt-4 max-w-2xl text-neutral-600">
                These items sit outside the standard flow and are quoted
                separately once the scope is confirmed.
              </p>
              <ul className="mt-8 flex flex-col divide-y divide-neutral-200 border-y border-neutral-200">
                {scenario.optional.map((item) => (
                  <li
                    key={item}
                    className="py-4 text-base leading-relaxed text-neutral-700"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <aside className="self-start rounded-2xl bg-neutral-950 p-8 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                Project confirmation
              </p>
              <p className="mt-4 text-sm leading-relaxed text-neutral-300">
                The standard service uses existing modules and one short
                approved message. Multi-robot work, new content and themed
                production require a separate quote.
              </p>
              <Link
                href="/robot-types"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-200"
              >
                Compare robot models
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </aside>
          </div>
        </Container>
      </section>

      <section className="w-full bg-neutral-100 py-16 sm:py-20">
        <Container>
          <div className="text-center">
            <SectionHeading>Related solutions</SectionHeading>
            <ul className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {related.map((item) => (
                <li key={item.slug}>
                  <Link
                    href={`/services/${item.slug}`}
                    className="inline-flex rounded-full border border-neutral-300 bg-white px-5 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-900"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>
    </>
  );
}

export default ScenarioDetail;
