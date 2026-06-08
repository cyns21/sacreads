"use client";

import { FormEvent, useState } from "react";
import {
  audiences,
  bookTypes,
  branches,
  defaultFilters,
  formats,
  genres,
  languages,
  moods,
} from "@/data/searchOptions";
import type { CatalogSearchFilters } from "@/types/book";

type SearchFormProps = {
  isLoading: boolean;
  onSearch: (filters: CatalogSearchFilters) => Promise<void> | void;
};

type SelectFieldProps = {
  label: string;
  name: keyof CatalogSearchFilters;
  options: string[];
  value: string;
  onChange: (name: keyof CatalogSearchFilters, value: string) => void;
};

function SelectField({ label, name, options, value, onChange }: SelectFieldProps) {
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
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

type YearFieldProps = {
  label: string;
  name: keyof Pick<CatalogSearchFilters, "yearFrom" | "yearTo">;
  placeholder: string;
  value: string;
  onChange: (name: keyof CatalogSearchFilters, value: string) => void;
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

export function SearchForm({ isLoading, onSearch }: SearchFormProps) {
  const [filters, setFilters] = useState<CatalogSearchFilters>(defaultFilters);

  function updateFilter(name: keyof CatalogSearchFilters, value: string) {
    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch(filters);
  }

  return (
    <section className="border-b border-[#ded3c2] bg-[#fffaf1]" id="find-books">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8 max-w-3xl">
          <p className="mb-3 text-sm font-bold uppercase text-[#8b4c35]">Recommendation request</p>
          <h2 className="text-3xl font-bold text-[#20231c] sm:text-4xl">Describe the shelf you want.</h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[#555d50]">
            Branch-aware filters keep every recommendation grounded in a physical hold request.
          </p>
        </div>

        <form
          className="rounded-lg border border-[#d8ccb9] bg-[#f8f5ee] p-4 shadow-sm sm:p-6"
          onSubmit={handleSubmit}
        >
          <label className="flex flex-col gap-2 text-sm font-semibold text-[#34392f]" htmlFor="reading-request">
            What do you want to read?
            <textarea
              className="min-h-40 resize-y rounded-md border border-[#cfc4b3] bg-white px-4 py-3 text-base leading-7 text-[#20231c] outline-none transition placeholder:text-[#8a8174] focus:border-[#315c8c] focus:ring-4 focus:ring-[#315c8c]/15"
              id="reading-request"
              name="reading-request"
              onChange={(event) => updateFilter("query", event.target.value)}
              placeholder="Tell us what you want to read..."
              value={filters.query}
            />
          </label>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SelectField
              label="Pickup branch"
              name="pickupBranch"
              onChange={updateFilter}
              options={branches}
              value={filters.pickupBranch}
            />
            <SelectField
              label="Language"
              name="language"
              onChange={updateFilter}
              options={languages}
              value={filters.language}
            />
            <SelectField label="Format" name="format" onChange={updateFilter} options={formats} value={filters.format} />
            <SelectField
              label="Fiction or nonfiction"
              name="bookType"
              onChange={updateFilter}
              options={bookTypes}
              value={filters.bookType}
            />
            <SelectField
              label="Audience"
              name="audience"
              onChange={updateFilter}
              options={audiences}
              value={filters.audience}
            />
            <SelectField label="Mood" name="mood" onChange={updateFilter} options={moods} value={filters.mood} />
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
            <SelectField label="Genre" name="genre" onChange={updateFilter} options={genres} value={filters.genre} />
          </div>

          <div className="mt-6 flex justify-end">
            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#214d45] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#173f3a] focus:outline-none focus:ring-4 focus:ring-[#214d45]/20 disabled:cursor-wait disabled:bg-[#76877e] sm:w-auto"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? (
                <span
                  aria-hidden="true"
                  className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                />
              ) : null}
              {isLoading ? "Searching Sacramento Public Library..." : "Find books at Sacramento Public Library"}
            </button>
          </div>
          {isLoading ? (
            <p className="mt-4 text-sm font-semibold text-[#214d45]" role="status">
              Loading book recommendations and hold links...
            </p>
          ) : null}
        </form>
      </div>
    </section>
  );
}
