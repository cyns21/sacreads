const steps = [
  {
    title: "Tell SacReads what you want to read",
    copy: "Share a mood, topic, age range, favorite author, or reading goal.",
  },
  {
    title: "SacReads searches with your library filters",
    copy: "Use branch, format, audience, language, publication year, mood, and genre filters.",
  },
  {
    title: "Pick a recommendation and request it through Sacramento Public Library",
    copy: "Review the fit, check the local catalog, and choose the physical copy you want to request.",
  },
];

export function HowItWorks() {
  return (
    <section className="bg-[#f8f5ee]" id="how-it-works">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8 max-w-3xl">
          <p className="mb-3 text-sm font-bold uppercase text-[#8b4c35]">How it works</p>
          <h2 className="text-3xl font-bold text-[#20231c] sm:text-4xl">From reading itch to pickup shelf.</h2>
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
