import Link from "next/link";
import { SERVICE_CATEGORY_META } from "@/lib/serviceCategories";

type Props = {
  /** Slug of the scenario currently being viewed, if any. */
  activeSlug?: string;
};

function CategoryChips({ activeSlug }: Props) {
  return (
    <nav aria-label="Service scenarios" className="w-full">
      <ul className="flex flex-row items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-neutral-200">
        <li>
          <Link
            href="/services"
            className="flex flex-row items-center gap-2 whitespace-nowrap rounded-full border-[1.5px] border-neutral-200 bg-white px-5 py-2 text-sm font-semibold text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-800"
          >
            All scenarios
          </Link>
        </li>
        {SERVICE_CATEGORY_META.map(({ slug, label, icon: Icon }) => {
          const selected = slug === activeSlug;
          return (
            <li key={slug}>
              <Link
                href={`/services/${slug}`}
                aria-current={selected ? "page" : undefined}
                className={`flex flex-row items-center gap-2 whitespace-nowrap rounded-full border-[1.5px] px-5 py-2 text-sm font-semibold transition ${
                  selected
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-200 bg-white text-neutral-500 hover:border-neutral-400 hover:text-neutral-800"
                }`}
              >
                <Icon size={16} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default CategoryChips;
