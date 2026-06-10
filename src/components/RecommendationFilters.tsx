"use client";

import type { BrowseFilterOptions, BrowseFilters, BrowseSort, FilterOption } from "@/types/book";

type RecommendationFiltersProps = {
  filters: BrowseFilters;
  options: BrowseFilterOptions;
  onChange: (filters: BrowseFilters) => void;
  onReset: () => void;
};

type SelectFieldProps = {
  label: string;
  name: keyof BrowseFilters;
  options: FilterOption[];
  value: string;
  allLabel: string;
  icon: "genre" | "language" | "audience" | "year" | "sort";
  onChange: (name: keyof BrowseFilters, value: string) => void;
};

type SortOption = {
  label: string;
  value: BrowseSort;
};

const sortOptions: SortOption[] = [
  { label: "Most Relevant", value: "Title A-Z" },
  { label: "Newest", value: "Newest" },
  { label: "Oldest", value: "Oldest" },
];

const iconPaths = {
  genre: ["M4 4h7l9 9-7 7-9-9V4Z", "M8 8h.01"],
  language: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M3.6 9h16.8", "M3.6 15h16.8", "M12 3a14 14 0 0 1 0 18", "M12 3a14 14 0 0 0 0 18"],
  audience: ["M16 19v-1.5A3.5 3.5 0 0 0 12.5 14h-5A3.5 3.5 0 0 0 4 17.5V19", "M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z", "M20 19v-1a3 3 0 0 0-2.2-2.9", "M15 3.3a4 4 0 0 1 0 7.4"],
  year: ["M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z", "M16 3v4", "M8 3v4", "M3 11h18"],
  sort: ["M11 5h10", "M11 12h7", "M11 19h4", "M3 7l2-2 2 2", "M5 5v14"],
};

function Icon({ kind }: { kind: keyof typeof iconPaths }) {
  return (
    <svg
      aria-hidden="true"
      className="size-5 shrink-0 text-[#214d45]"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      {iconPaths[kind].map((path) => (
        <path d={path} key={path} />
      ))}
    </svg>
  );
}

function optionText(option: FilterOption) {
  return option.count < 5 ? `${option.label} (${option.count})` : option.label;
}

function SelectField({ label, name, options, value, allLabel, icon, onChange }: SelectFieldProps) {
  return (
    <label className="flex min-w-0 flex-1 items-center gap-3 border-[#e4dacb] px-3 py-2 lg:border-r" htmlFor={name}>
      <Icon kind={icon} />
      <span className="min-w-0 flex-1">
        <span className="block text-[0.68rem] font-medium text-[#6a6257]">{label}</span>
        <select
          className="mt-1 h-8 w-full rounded-md bg-transparent text-sm font-bold text-[#20231c] outline-none focus:ring-4 focus:ring-[#315c8c]/15"
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
      </span>
    </label>
  );
}

export function RecommendationFilters({ filters, options, onChange, onReset }: RecommendationFiltersProps) {
  function updateFilter(name: keyof BrowseFilters, value: string) {
    onChange({
      ...filters,
      [name]: value,
    } as BrowseFilters);
  }

  return (
    <div className="rounded-xl border border-[#d8ccb9] bg-[#fffdfa] p-3 shadow-sm">
      <div className="grid gap-2 lg:grid-cols-[1.2fr_1.2fr_1.4fr_1.5fr_1.2fr_auto] lg:items-center">
        <SelectField
          allLabel="All genres"
          icon="genre"
          label="Genre"
          name="genre"
          onChange={updateFilter}
          options={options.genres}
          value={filters.genre}
        />
        <SelectField
          allLabel="All languages"
          icon="language"
          label="Language"
          name="language"
          onChange={updateFilter}
          options={options.languages}
          value={filters.language}
        />
        <SelectField
          allLabel="All audiences"
          icon="audience"
          label="Audience"
          name="audience"
          onChange={updateFilter}
          options={options.audiences}
          value={filters.audience}
        />
        <div className="flex min-w-0 items-center gap-3 border-[#e4dacb] px-3 py-2 lg:border-r">
          <Icon kind="year" />
          <div className="min-w-0 flex-1">
            <span className="block text-[0.68rem] font-medium text-[#6a6257]">Year</span>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <input
                aria-label="Publication year from"
                className="h-8 min-w-0 rounded-md bg-transparent text-sm font-bold text-[#20231c] outline-none placeholder:text-[#8a8174] focus:ring-4 focus:ring-[#315c8c]/15"
                inputMode="numeric"
                onChange={(event) => updateFilter("yearFrom", event.target.value)}
                placeholder="From"
                type="number"
                value={filters.yearFrom}
              />
              <input
                aria-label="Publication year to"
                className="h-8 min-w-0 rounded-md bg-transparent text-sm font-bold text-[#20231c] outline-none placeholder:text-[#8a8174] focus:ring-4 focus:ring-[#315c8c]/15"
                inputMode="numeric"
                onChange={(event) => updateFilter("yearTo", event.target.value)}
                placeholder="To"
                type="number"
                value={filters.yearTo}
              />
            </div>
          </div>
        </div>
        <label className="flex min-w-0 items-center gap-3 border-[#e4dacb] px-3 py-2 lg:border-r" htmlFor="sort">
          <Icon kind="sort" />
          <span className="min-w-0 flex-1">
            <span className="block text-[0.68rem] font-medium text-[#6a6257]">Sort by</span>
            <select
              className="mt-1 h-8 w-full rounded-md bg-transparent text-sm font-bold text-[#20231c] outline-none focus:ring-4 focus:ring-[#315c8c]/15"
              id="sort"
              name="sort"
              onChange={(event) => updateFilter("sort", event.target.value)}
              value={filters.sort}
            >
              {sortOptions.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </span>
        </label>
        <div className="flex px-3 py-2">
          <button
            className="h-11 w-full rounded-md border border-[#d8ccb9] bg-white px-4 text-sm font-bold text-[#74613f] transition hover:border-[#214d45] hover:text-[#214d45] focus:outline-none focus:ring-4 focus:ring-[#214d45]/15"
            onClick={onReset}
            type="button"
          >
            Clear filters
          </button>
        </div>
      </div>
    </div>
  );
}
