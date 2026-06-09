"use client";

import type { BrowseFilters, BrowseSort, FilterOption } from "@/types/book";

type FilterOptions = {
  genres: FilterOption[];
  formats: FilterOption[];
  languages: FilterOption[];
  audiences: FilterOption[];
};

type SearchFormProps = {
  filters: BrowseFilters;
  options: FilterOptions;
  resultCount: number;
  onChange: (filters: BrowseFilters) => void;
  onReset: () => void;
};

type SelectFieldProps = {
  label: string;
  name: keyof BrowseFilters;
  options: FilterOption[];
  value: string;
  allLabel: string;
  onChange: (name: keyof BrowseFilters, value: string) => void;
};

const sortOptions: BrowseSort[] = [
  "Highest Goodreads rating",
  "Most Goodreads reviews",
  "Newest",
  "Oldest",
  "Title A-Z",
];

function optionText(option: FilterOption) {
  return option.count < 5 ? `${option.label} (${option.count})` : option.label;
}

function SelectField({ label, name, options, value, allLabel, onChange }: SelectFieldProps) {
  return (
    <label className="flex flex-col gap-2 text-sm font-semibold text-[#34392f]" htmlFor={name}>
      {label}
      <select
        className="h-12 rounded-md border border-[#cfc4b3] bg-white px-3 text-sm font-medium text-[#20231c] outline-none transition focus:border-[#315c8c] focus:ring-4 focus:ring-[#315c8c]/15"
        id={name}
        name={name}
        onChange={(event) => onChange(name, event.target.value)}
        value={value}
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.label} value={option.label}>
            {optionText(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

type YearFieldProps = {
  label: string;
  name: keyof Pick<BrowseFilters, "yearFrom" | "yearTo">;
  placeholder: string;
  value: string;
  onChange: (name: keyof BrowseFilters, value: string) => void;
};

function YearField({ label, name, placeholder, value, onChange }: YearFieldProps) {
  return (
    <label className="flex flex-col gap-2 text-sm font-semibold text-[#34392f]" htmlFor={name}>
      {label}
      <input
        className="h-12 rounded-md border border-[#cfc4b3] bg-white px-3 text-sm font-medium text-[#20231c] outline-none transition placeholder:text-[#8a8174] focus:border-[#315c8c] focus:ring-4 focus:ring-[#315c8c]/15"
        id={name}
        inputMode="numeric"
        name={name}
        onChange={(event) => onChange(name, event.target.value)}
        placeholder={placeholder}
        type="number"
        value={value}
      />
    </label>
  );
}

export function SearchForm({ filters, options, resultCount, onChange, onReset }: SearchFormProps) {
  function updateFilter(name: keyof BrowseFilters, value: string) {
    onChange({
      ...filters,
      [name]: value,
    } as BrowseFilters);
  }

  return (
    <section className="border-b border-[#ded3c2] bg-[#fffaf1]" id="find-books">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <p className="mb-3 text-sm font-bold uppercase text-[#8b4c35]">Browse by genre</p>
            <h2 className="text-3xl font-bold text-[#20231c] sm:text-4xl">Sacramento Public Library catalog picks.</h2>
          </div>
          <div className="rounded-md border border-[#d8ccb9] bg-white px-4 py-3 text-sm font-bold text-[#214d45]">
            {resultCount.toLocaleString()} results
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {options.genres.map((option) => {
            const isSelected = filters.genre === option.label;

            return (
              <button
                className={`rounded-lg border px-4 py-4 text-left transition focus:outline-none focus:ring-4 focus:ring-[#315c8c]/15 ${
                  isSelected
                    ? "border-[#214d45] bg-[#214d45] text-white"
                    : "border-[#d8ccb9] bg-white text-[#20231c] hover:border-[#315c8c]"
                }`}
                key={option.label}
                onClick={() => updateFilter("genre", isSelected ? "" : option.label)}
                type="button"
              >
                <span className="block text-base font-bold">{option.label}</span>
                <span className={`mt-2 block text-sm font-semibold ${isSelected ? "text-white/80" : "text-[#6a6257]"}`}>
                  {option.count.toLocaleString()} books
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-8 grid gap-4 rounded-lg border border-[#d8ccb9] bg-[#f8f5ee] p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
          <SelectField
            allLabel="All genres"
            label="Genre"
            name="genre"
            onChange={updateFilter}
            options={options.genres}
            value={filters.genre}
          />
          <SelectField
            allLabel="All formats"
            label="Format"
            name="format"
            onChange={updateFilter}
            options={options.formats}
            value={filters.format}
          />
          <SelectField
            allLabel="All languages"
            label="Language"
            name="language"
            onChange={updateFilter}
            options={options.languages}
            value={filters.language}
          />
          <SelectField
            allLabel="All audiences"
            label="Audience"
            name="audience"
            onChange={updateFilter}
            options={options.audiences}
            value={filters.audience}
          />
          <YearField
            label="Publication year from"
            name="yearFrom"
            onChange={updateFilter}
            placeholder="1990"
            value={filters.yearFrom}
          />
          <YearField
            label="Publication year to"
            name="yearTo"
            onChange={updateFilter}
            placeholder="2026"
            value={filters.yearTo}
          />
          <label className="flex flex-col gap-2 text-sm font-semibold text-[#34392f]" htmlFor="sort">
            Sort
            <select
              className="h-12 rounded-md border border-[#cfc4b3] bg-white px-3 text-sm font-medium text-[#20231c] outline-none transition focus:border-[#315c8c] focus:ring-4 focus:ring-[#315c8c]/15"
              id="sort"
              name="sort"
              onChange={(event) => updateFilter("sort", event.target.value)}
              value={filters.sort}
            >
              {sortOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button
              className="h-12 w-full rounded-md border border-[#315c8c] bg-white px-4 text-sm font-bold text-[#315c8c] transition hover:bg-[#eef4fb] focus:outline-none focus:ring-4 focus:ring-[#315c8c]/15"
              onClick={onReset}
              type="button"
            >
              Reset filters
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
