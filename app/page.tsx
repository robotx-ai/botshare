import Link from "next/link";

export default function Home() {
  return (
    <section className="relative -mt-28 min-h-[calc(100vh-112px)] pt-28">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            "url('/assets/gemini-clean-1772488586634.png')",
        }}
      />
      <div className="absolute inset-0 bg-black/55" />

      <div className="relative z-10 flex min-h-[calc(100vh-112px)] items-center">
        <div className="mx-auto flex w-full max-w-6xl flex-col px-6 py-16 sm:px-10 lg:px-12">
          <div className="max-w-3xl space-y-6">
            <h1 className="text-5xl font-semibold leading-tight text-white sm:text-6xl lg:text-7xl">
              Book RobotX deployments for events, operations, and daily service.
            </h1>
            <div className="flex flex-col gap-4 pt-4 sm:flex-row">
              <Link
                href="/services"
                className="inline-flex w-full items-center justify-center rounded-full bg-white px-8 py-4 text-base font-semibold text-black transition hover:bg-neutral-200 sm:w-auto"
              >
                Explore Services
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
