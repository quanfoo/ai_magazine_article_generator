"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, FileText, Search, Trash2 } from "lucide-react";
import type { ArticleSummary } from "@/lib/api";
import { deleteArticle } from "@/lib/api";
import { formatDateTime } from "@/lib/date-format";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";

type SortField = "id" | "title" | "status" | "createdAt" | "updatedAt";
type SortDirection = "asc" | "desc";

const PAGE_SIZE = 10;

const SORTABLE_FIELDS: { field: SortField; label: string; className?: string }[] = [
  { field: "id", label: "ID" },
  { field: "title", label: "Article" },
  { field: "status", label: "Status" },
  { field: "createdAt", label: "Created" },
  { field: "updatedAt", label: "Updated" }
];

export function ArticlesTable({ initialArticles }: { initialArticles: ArticleSummary[] }) {
  const router = useRouter();
  const [articles, setArticles] = useState(initialArticles);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("updatedAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const filteredArticles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return articles;
    }

    return articles.filter((article) => article.title.toLowerCase().includes(normalizedQuery));
  }, [articles, query]);

  const sortedArticles = useMemo(() => {
    return [...filteredArticles].sort((first, second) => {
      const result = compareArticles(first, second, sortField);
      return sortDirection === "asc" ? result : -result;
    });
  }, [filteredArticles, sortDirection, sortField]);

  const totalPages = Math.max(1, Math.ceil(sortedArticles.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleArticles = sortedArticles.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function updateQuery(value: string) {
    setQuery(value);
    setPage(1);
  }

  function updateSort(field: SortField) {
    if (field === sortField) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection(field === "updatedAt" || field === "createdAt" || field === "id" ? "desc" : "asc");
    }

    setPage(1);
  }

  async function handleDelete(article: ArticleSummary) {
    const confirmed = window.confirm(`Delete "${article.title}"?`);

    if (!confirmed) {
      return;
    }

    setDeletingId(article.id);

    try {
      await deleteArticle(article.id);
      setArticles((current) => current.filter((item) => item.id !== article.id));
      setPage((current) => Math.min(current, Math.max(1, Math.ceil((sortedArticles.length - 1) / PAGE_SIZE))));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => updateQuery(event.target.value)}
          placeholder="Search by title..."
          className="h-10 w-full rounded-md border border-border bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          type="search"
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-white">
        <div className="hidden grid-cols-[80px_1fr_110px_170px_170px_72px] border-b border-border px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground md:grid">
          {SORTABLE_FIELDS.map((column) => (
            <SortButton
              key={column.field}
              field={column.field}
              label={column.label}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={updateSort}
            />
          ))}
          <span aria-hidden="true" />
        </div>

        {articles.length === 0 ? (
          <EmptyState message="No drafts yet. Upload a .docx notes file to generate one." />
        ) : visibleArticles.length === 0 ? (
          <EmptyState message="No articles match that title." />
        ) : (
          visibleArticles.map((article) => (
            <div
              key={article.id}
              aria-label={`Open ${article.title}`}
              className="grid cursor-pointer gap-y-3 border-b border-border px-4 py-4 last:border-b-0 hover:bg-slate-50 md:grid-cols-[80px_1fr_110px_170px_170px_72px] md:items-center"
              onClick={() => router.push(`/articles/${article.id}`)}
              onKeyDown={(event) => {
                if (event.target instanceof HTMLElement && event.target.closest("button")) {
                  return;
                }

                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  router.push(`/articles/${article.id}`);
                }
              }}
              role="link"
              tabIndex={0}
            >
              <span className="text-sm font-medium text-muted-foreground">#{article.id}</span>
              <div>
                <div className="font-medium">{article.title}</div>
                <div className="text-sm text-muted-foreground">
                  {article.originalFilename ?? "No source file"} · {formatWarningCounts(
                    article.warningsCount,
                    article.reviewedWarningsCount ?? 0
                  )}
                </div>
              </div>
              <StatusBadge status={article.status} />
              <span className="text-sm text-muted-foreground">{formatDateTime(article.createdAt)}</span>
              <span className="text-sm text-muted-foreground">{formatDateTime(article.updatedAt)}</span>
              <Button
                aria-label={`Delete ${article.title}`}
                className="h-9 w-fit justify-self-start px-2 text-rose-700 hover:bg-rose-50 hover:text-rose-800 md:justify-self-end"
                disabled={deletingId === article.id}
                onClick={(event) => {
                  event.stopPropagation();
                  handleDelete(article);
                }}
                type="button"
                variant="ghost"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>
          Showing {visibleArticles.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}-
          {Math.min(currentPage * PAGE_SIZE, sortedArticles.length)} of {sortedArticles.length}
        </span>
        <div className="flex items-center gap-2">
          <Button
            disabled={currentPage === 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            type="button"
            variant="secondary"
          >
            Previous
          </Button>
          <span className="min-w-20 text-center">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            disabled={currentPage === totalPages}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            type="button"
            variant="secondary"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

function SortButton({
  field,
  label,
  sortField,
  sortDirection,
  onSort
}: {
  field: SortField;
  label: string;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
}) {
  const isActive = field === sortField;
  const Icon = sortDirection === "asc" ? ArrowUp : ArrowDown;

  return (
    <button
      className="inline-flex w-fit justify-self-start items-center gap-1 text-left uppercase transition hover:text-slate-950"
      onClick={() => onSort(field)}
      type="button"
    >
      <span>{label}</span>
      {isActive ? <Icon className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5 opacity-30" />}
    </button>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center text-muted-foreground">
      <FileText className="h-9 w-9" />
      <p>{message}</p>
    </div>
  );
}

function compareArticles(first: ArticleSummary, second: ArticleSummary, field: SortField) {
  if (field === "id") {
    return first.id - second.id;
  }

  if (field === "createdAt" || field === "updatedAt") {
    return new Date(first[field]).getTime() - new Date(second[field]).getTime();
  }

  return first[field].localeCompare(second[field]);
}

function formatWarningCounts(warningsCount: number, reviewedWarningsCount: number) {
  const warningsLabel = formatCount(warningsCount, "warning");

  if (reviewedWarningsCount === 0) {
    return warningsLabel;
  }

  return `${warningsLabel} · ${formatCount(reviewedWarningsCount, "reviewed warning")}`;
}

function formatCount(count: number, label: string) {
  const safeCount = count ?? 0;

  return `${safeCount} ${label}${safeCount === 1 ? "" : "s"}`;
}
