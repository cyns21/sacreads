const branches = [
  "Central Library",
  "South Natomas Library",
  "North Natomas Library",
  "Belle Cooledge Library",
  "Arcade Library",
  "Colonial Heights Library",
  "Robbie Waters Pocket-Greenhaven Library",
];

const languages = ["Any language", "English", "Spanish", "Chinese", "Vietnamese", "Russian"];
const formats = ["Book", "Picture Book"];
const bookTypes = ["Any", "Fiction", "Nonfiction"];
const audiences = ["General", "Adult", "Juvenile", "Young Adult"];
const moods = ["Any mood", "Cozy", "Thought-provoking", "Funny", "Adventurous", "Reflective"];
const genres = [
  "Any genre",
  "Mystery",
  "Historical fiction",
  "Science fiction",
  "Fantasy",
  "Romance",
  "Biography",
  "Cookbook",
];

type SelectFieldProps = {
  label: string;
  name: string;
  options: string[];
};

function SelectField({ label, name, options }: SelectFieldProps) {
  return (
    <label className="flex flex-col gap-2 text-sm font-semibold text-[#34392f]" htmlFor={name}>
      {label}
      <select
        className="h-12 rounded-md border border-[#cfc4b3] bg-white px-3 text-sm font-medium text-[#20231c] outline-none transition focus:border-[#315c8c] focus:ring-4 focus:ring-[#315c8c]/15"
        id={name}
        name={name}
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

type YearFieldProps = {
  label: string;
  name: string;
  placeholder: string;
};

function YearField({ label, name, placeholder }: YearFieldProps) {
  return (
    <label className="flex flex-col gap-2 text-sm font-semibold text-[#34392f]" htmlFor={name}>
      {label}
      <input
        className="h-12 rounded-md border border-[#cfc4b3] bg-white px-3 text-sm font-medium text-[#20231c] outline-none transition placeholder:text-[#8a8174] focus:border-[#315c8c] focus:ring-4 focus:ring-[#315c8c]/15"
        id={name}
        inputMode="numeric"
        name={name}
        placeholder={placeholder}
        type="number"
      />
    </label>
  );
}

export function SearchForm() {
  return (
    <section className="border-b border-[#ded3c2] bg-[#fffaf1]" id="find-books">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8 max-w-3xl">
          <p className="mb-3 text-sm font-bold uppercase text-[#8b4c35]">Recommendation request</p>
          <h2 className="text-3xl font-bold text-[#20231c] sm:text-4xl">Describe the shelf you want.</h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[#555d50]">
            Branch-aware filters keep every recommendation grounded in a physical pickup request.
          </p>
        </div>

        <form className="rounded-lg border border-[#d8ccb9] bg-[#f8f5ee] p-4 shadow-sm sm:p-6">
          <label className="flex flex-col gap-2 text-sm font-semibold text-[#34392f]" htmlFor="reading-request">
            What do you want to read?
            <textarea
              className="min-h-40 resize-y rounded-md border border-[#cfc4b3] bg-white px-4 py-3 text-base leading-7 text-[#20231c] outline-none transition placeholder:text-[#8a8174] focus:border-[#315c8c] focus:ring-4 focus:ring-[#315c8c]/15"
              id="reading-request"
              name="reading-request"
              placeholder="Tell us what you want to read..."
            />
          </label>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SelectField label="Pickup branch" name="pickup-branch" options={branches} />
            <SelectField label="Language" name="language" options={languages} />
            <SelectField label="Format" name="format" options={formats} />
            <SelectField label="Fiction or nonfiction" name="book-type" options={bookTypes} />
            <SelectField label="Audience" name="audience" options={audiences} />
            <SelectField label="Mood" name="mood" options={moods} />
            <YearField label="Publication year from" name="year-from" placeholder="1990" />
            <YearField label="Publication year to" name="year-to" placeholder="2026" />
            <SelectField label="Genre" name="genre" options={genres} />
          </div>

          <div className="mt-6 flex justify-end">
            <button
              className="w-full rounded-md bg-[#214d45] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#173f3a] focus:outline-none focus:ring-4 focus:ring-[#214d45]/20 sm:w-auto"
              type="button"
            >
              Find books at Sacramento Public Library
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
