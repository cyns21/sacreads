const steps = [
  {
    title: "Browse local data",
    copy: "SacReads uses an imported Sacramento Public Library book dataset.",
  },
  {
    title: "Refine the list",
    copy: "Filter by genre, format, language, audience, and publication year.",
  },
  {
    title: "View on SPL",
    copy: "Open the SPL catalog for current availability, requests, and details.",
  },
];

export function HowItWorks() {
  return (
    <section className="border-b border-[#ded3c2] bg-[#f8f5ee]" id="how-it-works">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 lg:grid-cols-[300px_1fr] lg:items-start">
        <div>
          <p className="mb-3 text-sm font-bold uppercase text-[#8b4c35]">How it works</p>
          <h2 className="text-3xl font-bold text-[#20231c] sm:text-4xl">Simple local recommendations.</h2>
        </div>

        <ol className="grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <li className="rounded-lg border border-[#d8ccb9] bg-white p-5 shadow-sm" key={step.title}>
              <span className="grid size-10 place-items-center rounded-md bg-[#cbd8bc] text-sm font-bold text-[#214d45]">
                {index + 1}
              </span>
              <h3 className="mt-5 text-lg font-bold leading-7 text-[#20231c]">{step.title}</h3>
              <p className="mt-3 text-sm leading-6 text-[#555d50]">{step.copy}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
