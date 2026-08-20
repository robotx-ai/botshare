import Image from "next/image";
import Link from "next/link";
import type { ServiceScenario } from "@/lib/serviceScenarios";
import { barlow } from "@/lib/fonts";

type Props = {
  scenario: ServiceScenario;
};

// Deliberately no entrance animation: this grid is the page's primary content,
// and any opacity-0 start state hides it whenever the animation is throttled
// (background tabs) or never runs. The motion lives in the hover/focus states.
function ScenarioCard({ scenario }: Props) {
  return (
    <article>
      <Link
        href={`/services/${scenario.slug}`}
        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white transition-colors duration-300 hover:border-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
      >
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-neutral-100">
          <Image
            src={scenario.thumbnail}
            alt={scenario.label}
            fill
            sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 100vw"
            className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
          />
        </div>

        <div className="flex flex-1 flex-col gap-3 p-6">
          <h3
            className={`${barlow.className} text-2xl font-bold uppercase leading-none tracking-tight text-neutral-900`}
          >
            {scenario.label}
          </h3>
          <div className="flex flex-1 items-end justify-between gap-4">
            <p className="text-sm leading-relaxed text-neutral-500">
              {scenario.lede}
            </p>
            <span
              aria-hidden="true"
              className="mb-1 shrink-0 text-lg text-neutral-400 transition-all duration-300 group-hover:translate-x-1 group-hover:text-neutral-900"
            >
              &rarr;
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}

export default ScenarioCard;
