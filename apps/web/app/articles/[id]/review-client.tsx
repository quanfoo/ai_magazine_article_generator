"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, ChevronDown, FileText, Minus, Plus, RotateCcw, Save, Search, X } from "lucide-react";
import type { Article, KeyFact, Section, SourceChunk, Warning } from "@/lib/api";
import { saveArticle } from "@/lib/api";
import { formatDateTime } from "@/lib/date-format";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";

const UNSAVED_CHANGES_MESSAGE = "You have unsaved changes. Leave this page?";

export function ArticleEditor({ initialArticle }: { initialArticle: Article }) {
  const [article, setArticle] = useState(initialArticle);
  const [lastSavedArticle, setLastSavedArticle] = useState(initialArticle);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [highlightedChunkId, setHighlightedChunkId] = useState<number | null>(null);
  const [activeSectionId, setActiveSectionId] = useState(OUTLINE_ITEMS[0].id);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [notesQuery, setNotesQuery] = useState("");
  const [updatedLabel, setUpdatedLabel] = useState(formatDateTime(initialArticle.updatedAt));
  const [reviewedWarningKeys, setReviewedWarningKeys] = useState<Set<string>>(
    () => new Set(initialArticle.reviewedWarningIds ?? [])
  );
  const reviewedWarningKeysRef = useRef(new Set(initialArticle.reviewedWarningIds ?? []));

  useUnsavedChangesWarning(hasUnsavedChanges);

  const chunksById = useMemo(
    () => new Map(article.sourceChunks.map((chunk) => [chunk.id, chunk])),
    [article.sourceChunks]
  );
  const factGroups = useMemo(() => groupFacts(article.keyFacts), [article.keyFacts]);
  const activeWarnings = useMemo(
    () => article.warnings.filter((warning) => !reviewedWarningKeys.has(getWarningKey(warning))),
    [article.warnings, reviewedWarningKeys]
  );
  const reviewedWarnings = useMemo(
    () => article.warnings.filter((warning) => reviewedWarningKeys.has(getWarningKey(warning))),
    [article.warnings, reviewedWarningKeys]
  );
  const warningGroups = useMemo(() => groupWarnings(activeWarnings), [activeWarnings]);
  const filteredSourceChunks = useMemo(() => {
    const query = notesQuery.trim().toLowerCase();

    if (!query) {
      return article.sourceChunks;
    }

    return article.sourceChunks.filter((chunk) => {
      return `note ${chunk.position} ${chunk.content}`.toLowerCase().includes(query);
    });
  }, [article.sourceChunks, notesQuery]);
  const canApproveDraft = article.status === "draft";
  const canSave = hasUnsavedChanges || canApproveDraft;
  const hookSection = article.sections[0];
  const draftSections = article.sections.slice(1);

  useEffect(() => {
    document.title = getBrowserTitle(article.title);
  }, [article.title]);

  useEffect(() => {
    function updateActiveSection() {
      const offset = 140;
      const activeItem =
        [...OUTLINE_ITEMS]
          .reverse()
          .find((item) => {
            const element = document.getElementById(item.id);
            return element ? element.getBoundingClientRect().top <= offset : false;
          }) ?? OUTLINE_ITEMS[0];

      setActiveSectionId(activeItem.id);
    }

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);

    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, []);

  useEffect(() => {
    if (!isNotesOpen || highlightedChunkId === null) {
      return;
    }

    window.requestAnimationFrame(() => {
      document
        .getElementById(`notes-modal-chunk-${highlightedChunkId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [highlightedChunkId, isNotesOpen, filteredSourceChunks]);

  useEffect(() => {
    function updateLabel() {
      setUpdatedLabel(formatRelativeUpdate(article.updatedAt));
    }

    updateLabel();
    const intervalId = window.setInterval(updateLabel, 60_000);

    return () => window.clearInterval(intervalId);
  }, [article.updatedAt]);

  async function onSave() {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const saved = await saveArticle({ ...article, reviewedWarningIds: Array.from(reviewedWarningKeysRef.current) });
      setArticle(saved);
      setLastSavedArticle(saved);
      const savedWarningKeys = new Set(saved.reviewedWarningIds ?? []);
      reviewedWarningKeysRef.current = savedWarningKeys;
      setReviewedWarningKeys(savedWarningKeys);
      setHasUnsavedChanges(false);
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setIsSaving(false);
    }
  }

  function onDiscardChanges() {
    setArticle(lastSavedArticle);
    const savedWarningKeys = new Set(lastSavedArticle.reviewedWarningIds ?? []);
    reviewedWarningKeysRef.current = savedWarningKeys;
    setReviewedWarningKeys(savedWarningKeys);
    setHasUnsavedChanges(false);
    setSaveMessage(null);
  }

  function updateFact(index: number, field: "label" | "value", value: string) {
    const keyFacts = [...article.keyFacts];
    keyFacts[index] = { ...keyFacts[index], [field]: value };
    setArticle({ ...article, keyFacts });
    setHasUnsavedChanges(true);
  }

  function createFact(label: string, value: string) {
    setArticle({
      ...article,
      keyFacts: [...article.keyFacts, { label, value, sourceChunkIds: [] }]
    });
    setHasUnsavedChanges(true);
  }

  function appendGeneralFact() {
    setArticle((current) => {
      const generalFacts = current.keyFacts.filter((fact) => {
        const text = `${fact.label} ${fact.value}`.toLowerCase();

        return !(
          matchesAny(text, ["not for", "not ideal", "avoid", "unsuitable", "not suitable"]) ||
          matchesAny(text, ["best for", "target audience", "ideal for", "good for", "suited for"]) ||
          matchesAny(text, ["safety", "ethic", "sustainability", "risk", "wildlife", "current", "coral"])
        );
      });
      const newFacts = [{ label: "Fact", value: "", sourceChunkIds: [] }];

      if (generalFacts.length === 0) {
        newFacts.push({ label: "Fact", value: "", sourceChunkIds: [] });
      }

      return { ...current, keyFacts: [...current.keyFacts, ...newFacts] };
    });
    setHasUnsavedChanges(true);
  }

  function appendArticleSection() {
    setArticle((current) => {
      const sections = [...current.sections];

      if (sections.length === 0) {
        sections.push({ heading: "Overview", body: "", sourceChunkIds: [] });
      }

      if (sections.length === 1) {
        sections.push({ heading: "Article", body: "", sourceChunkIds: [] });
      }

      sections.push({ heading: "Article", body: "", sourceChunkIds: [] });

      return { ...current, sections };
    });
    setHasUnsavedChanges(true);
  }

  function deleteSection(index: number) {
    setArticle({
      ...article,
      sections: article.sections.filter((_, sectionIndex) => sectionIndex !== index)
    });
    setHasUnsavedChanges(true);
  }

  function deleteFact(index: number) {
    setArticle({
      ...article,
      keyFacts: article.keyFacts.filter((_, factIndex) => factIndex !== index)
    });
    setHasUnsavedChanges(true);
  }

  function updateSection(index: number, field: "heading" | "body", value: string) {
    const sections = [...article.sections];
    sections[index] = { ...sections[index], [field]: value };
    setArticle({ ...article, sections });
    setHasUnsavedChanges(true);
  }

  function upsertSection(index: number, heading: string, body: string) {
    setArticle((current) => {
      const sections = [...current.sections];

      while (sections.length <= index) {
        sections.push({ heading: sections.length === 0 ? "Overview" : "Article", body: "", sourceChunkIds: [] });
      }

      sections[index] = { ...sections[index], heading, body };

      return { ...current, sections };
    });
    setHasUnsavedChanges(true);
  }

  function selectSource(id: number) {
    setHighlightedChunkId(id);
    setNotesQuery("");
    setIsNotesOpen(true);
  }

  function openNotes() {
    setHighlightedChunkId(null);
    setNotesQuery("");
    setIsNotesOpen(true);
  }

  function markWarningReviewed(warning: Warning) {
    const next = new Set(reviewedWarningKeysRef.current);
    next.add(getWarningKey(warning));
    reviewedWarningKeysRef.current = next;
    setReviewedWarningKeys(next);
    setArticle((current) => ({ ...current, reviewedWarningIds: Array.from(next) }));
    setHasUnsavedChanges(true);
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-3.5 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <Button asChild variant="ghost" className="h-9 px-2">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Articles
              </Link>
            </Button>
            <StatusBadge status={article.status} />
            <span className="text-sm text-muted-foreground">•</span>
            {canSave ? (
              <span className="text-sm text-amber-700">Unsaved</span>
            ) : (
              <span className="text-sm text-muted-foreground" title={formatDateTime(article.updatedAt)}>
                Updated {updatedLabel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {saveMessage ? <span className="text-sm text-muted-foreground">{saveMessage}</span> : null}
            <Button
              onClick={onSave}
              disabled={isSaving || !canSave}
              className="h-9"
              variant="primary"
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
            <Button
              onClick={onDiscardChanges}
              disabled={isSaving || !hasUnsavedChanges}
              className="h-9"
              variant="secondary"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Discard
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-7 px-6 py-7 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,980px)]">
        <OutlineNav activeSectionId={activeSectionId} onSelect={setActiveSectionId} onOpenNotes={openNotes} />

        <section className="space-y-7">
          {article.status === "failed" ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-5 text-rose-800">
              <h1 className="font-semibold">Generation failed</h1>
              <p className="mt-2 text-sm">{article.failureReason ?? "The API could not generate a valid draft."}</p>
            </div>
          ) : null}

          <div id="title" className="scroll-mt-6 rounded-lg border border-border bg-white p-6">
            <label className="text-lg font-semibold text-slate-950">Title</label>
            <input
              className="mt-2 w-full rounded-md border border-border bg-white px-3 py-2.5 font-semibold outline-none focus:border-slate-500"
              value={article.title}
              onChange={(event) => {
                setArticle({ ...article, title: event.target.value });
                setHasUnsavedChanges(true);
              }}
            />
            <InlineWarnings
              warnings={warningGroups.title}
              onReview={markWarningReviewed}
              className="mt-4"
            />
          </div>

          <EditorCard id="hook-intro" title="Overview">
            <InlineWarnings warnings={warningGroups.hookIntro} onReview={markWarningReviewed} />
            {hookSection ? (
              <SectionEditor
                section={hookSection}
                onChange={(field, value) => updateSection(0, field, value)}
                chunksById={chunksById}
                onSelectSource={selectSource}
              />
            ) : (
              <EmptySectionEditor
                heading="Overview"
                placeholder="Draft a short opening angle for this article..."
                onCreate={(heading, body) => upsertSection(0, heading, body)}
              />
            )}
          </EditorCard>

          <EditorCard id="magazine-draft" title="Article">
            <InlineWarnings warnings={warningGroups.magazineDraft} onReview={markWarningReviewed} />
            <div className="space-y-4">
              {(draftSections.length === 0
                ? [{ heading: "Article", body: "", sourceChunkIds: [] }]
                : draftSections
              ).map((section, index) => (
                <SectionEditor
                  key={`article-section-${index + 1}`}
                  section={section}
                  bodyPlaceholder="Draft the next article section..."
                  onChange={(field, value) => {
                    const nextSection = { ...section, [field]: value };

                    if (draftSections.length === 0) {
                      upsertSection(index + 1, nextSection.heading, nextSection.body);
                    } else {
                      updateSection(index + 1, field, value);
                    }
                  }}
                  chunksById={chunksById}
                  removeDisabled={draftSections.length === 0}
                  onRemove={() => deleteSection(index + 1)}
                  onSelectSource={selectSource}
                />
              ))}
              <AddItemButton label="Add article section" onClick={appendArticleSection} />
            </div>
          </EditorCard>

          <EditorCard
            id="extracted-facts"
            title="Extracted facts"
            helper="Supporting details from the notes. Edit anything that needs a clearer editorial shape."
          >
            <InlineWarnings warnings={warningGroups.facts} onReview={markWarningReviewed} />
            <FactList
              facts={factGroups.general}
              chunksById={chunksById}
              onChange={updateFact}
              onCreate={(label, value) => createFact(label, value)}
              onAdd={appendGeneralFact}
              onRemove={deleteFact}
              onSelectSource={selectSource}
              emptyPlaceholder="Add a structured fact from the notes..."
            />
          </EditorCard>

          <EditorCard id="best-for" title="Best for">
            <InlineWarnings warnings={warningGroups.bestFor} onReview={markWarningReviewed} />
            <TagFactList
              facts={factGroups.bestFor}
              chunksById={chunksById}
              onChange={(index, value) => updateFact(index, "value", value)}
              onCreate={(value) => createFact("Best for", value)}
              onRemove={deleteFact}
              onSelectSource={selectSource}
              placeholder="Enter to add traveler type..."
            />
          </EditorCard>

          <EditorCard id="not-for" title="Not ideal for">
            <InlineWarnings warnings={warningGroups.notFor} onReview={markWarningReviewed} />
            <TagFactList
              facts={factGroups.notFor}
              chunksById={chunksById}
              onChange={(index, value) => updateFact(index, "value", value)}
              onCreate={(value) => createFact("Not ideal for", value)}
              onRemove={deleteFact}
              onSelectSource={selectSource}
              placeholder="Enter to add traveler type..."
            />
          </EditorCard>

          <EditorCard id="ethics-safety" title="Safety notes">
            <InlineWarnings warnings={warningGroups.ethicsSafety} onReview={markWarningReviewed} />
            <FactList
              facts={factGroups.ethicsSafety}
              chunksById={chunksById}
              onChange={updateFact}
              onCreate={(_, value) => createFact("Safety notes", value)}
              onSelectSource={selectSource}
              emptyPlaceholder="Add safety or ethical considerations if relevant..."
              hideLabels
            />
          </EditorCard>

          <ReviewedWarnings warnings={reviewedWarnings} />

          <div className="flex items-center justify-end gap-3">
            {saveMessage ? <span className="text-sm text-muted-foreground">{saveMessage}</span> : null}
            <Button
              onClick={onSave}
              disabled={isSaving || !canSave}
              variant="primary"
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
            <Button onClick={onDiscardChanges} disabled={isSaving || !hasUnsavedChanges} variant="secondary">
              <RotateCcw className="mr-2 h-4 w-4" />
              Discard
            </Button>
          </div>
        </section>
      </div>

      <NotesModal
        chunks={filteredSourceChunks}
        query={notesQuery}
        highlightedChunkId={highlightedChunkId}
        isOpen={isNotesOpen}
        onClose={() => setIsNotesOpen(false)}
        onQueryChange={setNotesQuery}
      />
    </main>
  );
}

const OUTLINE_ITEMS = [
  { id: "title", href: "#title", label: "Title" },
  { id: "hook-intro", href: "#hook-intro", label: "Overview" },
  { id: "magazine-draft", href: "#magazine-draft", label: "Article" },
  { id: "extracted-facts", href: "#extracted-facts", label: "Extracted facts" },
  { id: "best-for", href: "#best-for", label: "Best for" },
  { id: "not-for", href: "#not-for", label: "Not ideal for" },
  { id: "ethics-safety", href: "#ethics-safety", label: "Safety notes" },
  { id: "reviewed-warnings", href: "#reviewed-warnings", label: "Reviewed warnings" }
];

function getBrowserTitle(title: string) {
  return `Article - ${title.trim() || "Untitled article"}`;
}

function OutlineNav({
  activeSectionId,
  onSelect,
  onOpenNotes
}: {
  activeSectionId: string;
  onSelect: (id: string) => void;
  onOpenNotes: () => void;
}) {
  return (
    <aside className="hidden lg:block">
      <nav className="sticky top-5 p-2">
        <p className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-500">Article outline</p>
        <div className="space-y-0.5">
          {OUTLINE_ITEMS.map((item) => {
            const isActive = activeSectionId === item.id;

            return (
              <a
                key={item.href}
                href={item.href}
                onClick={() => onSelect(item.id)}
                aria-current={isActive ? "true" : undefined}
                className={[
                  "block rounded-md border-l-2 px-3 py-2 text-sm transition",
                  isActive
                    ? "border-slate-400 bg-slate-100 text-slate-950"
                    : "border-transparent font-normal text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                ].join(" ")}
              >
                {item.label}
              </a>
            );
          })}
        </div>
        <div className="mt-3 border-t border-slate-200 pt-3">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-normal text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
            onClick={onOpenNotes}
          >
            <FileText className="h-4 w-4" />
            Open original notes
          </button>
        </div>
      </nav>
    </aside>
  );
}

function EditorCard({
  id,
  title,
  helper,
  children
}: {
  id?: string;
  title: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6 rounded-lg border border-border bg-white p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        {helper ? <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{helper}</p> : null}
      </div>
      {children}
    </section>
  );
}

function AddItemButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button
      aria-label={label}
      className="w-10 h-10 shrink-0 px-0"
      onClick={onClick}
      title={label}
      type="button"
      variant="secondary"
    >
      <Plus className="h-4 w-4" />
    </Button>
  );
}

function RemoveItemButton({
  disabled = false,
  label,
  onClick
}: {
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      aria-label={label}
      className="w-10 h-10 shrink-0 px-0"
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
      variant="secondary"
    >
      <Minus className="h-4 w-4" />
    </Button>
  );
}

function InlineWarnings({
  warnings,
  onReview,
  className
}: {
  warnings: Warning[];
  onReview: (warning: Warning) => void;
  className?: string;
}) {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <div className={["mb-4 space-y-1.5", className].filter(Boolean).join(" ")}>
      {warnings.map((warning, index) => (
        <div key={index} className="rounded-md border border-amber-200/80 bg-amber-50/70 px-3 py-2 text-sm text-amber-950">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-2">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none text-amber-600" />
              <p>{warning.message}</p>
            </div>
            <button
              type="button"
              className="self-start text-xs font-medium text-amber-800 underline-offset-2 transition hover:text-amber-950 hover:underline"
              onClick={() => onReview(warning)}
            >
              Mark reviewed
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ReviewedWarnings({ warnings }: { warnings: Warning[] }) {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <section id="reviewed-warnings" className="scroll-mt-6 rounded-lg border border-border bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-950">Reviewed warnings ({warnings.length})</h2>
      <div className="mt-4 space-y-2 text-sm text-slate-600">
        {warnings.map((warning) => (
          <p key={getWarningKey(warning)} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            {warning.message}
          </p>
        ))}
      </div>
    </section>
  );
}

function NotesModal({
  chunks,
  query,
  highlightedChunkId,
  isOpen,
  onClose,
  onQueryChange
}: {
  chunks: SourceChunk[];
  query: string;
  highlightedChunkId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onQueryChange: (value: string) => void;
}) {
  const [expandedChunkIds, setExpandedChunkIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (query.trim() && chunks.length > 0) {
      setExpandedChunkIds(new Set([chunks[0].id]));
      return;
    }

    if (highlightedChunkId !== null) {
      setExpandedChunkIds(new Set([highlightedChunkId]));
      return;
    }

    setExpandedChunkIds(new Set());
  }, [chunks, highlightedChunkId, isOpen, query]);

  if (!isOpen) {
    return null;
  }

  const hasQuery = query.trim().length > 0;

  function toggleChunk(id: number) {
    setExpandedChunkIds((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/30 px-4 py-6"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="mx-auto flex h-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex flex-col gap-4 px-7 pb-3 pt-6 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-semibold text-slate-950">Original notes</h2>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center self-start rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 md:self-auto"
            onClick={onClose}
            aria-label="Close original notes"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-7 pb-4">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="w-full rounded-md border border-slate-200 bg-slate-50/60 py-2 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-slate-400 focus:bg-white"
              value={query}
              placeholder="Search notes..."
              onChange={(event) => onQueryChange(event.target.value)}
            />
          </label>
        </div>

        <div className="flex-1 overflow-auto px-7 pb-7">
          {chunks.length === 0 ? (
            <p className="py-3 text-sm text-muted-foreground">No notes match this search.</p>
          ) : (
            chunks.map((chunk) => {
              const isReferenced = highlightedChunkId === chunk.id;
              const isExpanded = expandedChunkIds.has(chunk.id);

              return (
                <article
                  key={chunk.id}
                  id={`notes-modal-chunk-${chunk.id}`}
                  className={[
                    "scroll-mt-6 border-t border-slate-100 py-3 first:border-t-0 transition-colors",
                    isReferenced ? "rounded-md bg-amber-50/70" : ""
                  ].join(" ")}
                >
                  <button
                    type="button"
                    className="flex w-full items-start justify-between gap-4 text-left"
                    onClick={() => toggleChunk(chunk.id)}
                    aria-expanded={isExpanded}
                  >
                    <span>
                      <span className="block text-sm font-semibold text-slate-950">Note {chunk.position}</span>
                      {isExpanded ? null : (
                        <span className="mt-1 line-clamp-2 block text-sm leading-6 text-slate-600">
                          {previewSource(chunk.content)}
                        </span>
                      )}
                    </span>
                    <ChevronDown
                      className={[
                        "mt-0.5 h-5 w-5 flex-none stroke-[3] text-slate-700 transition-transform",
                        isExpanded ? "rotate-180" : ""
                      ].join(" ")}
                    />
                  </button>
                  {isExpanded ? (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{chunk.content}</p>
                  ) : null}
                </article>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function useUnsavedChangesWarning(hasUnsavedChanges: boolean) {
  const hasUnsavedChangesRef = useRef(hasUnsavedChanges);
  const allowNavigationRef = useRef(false);

  useEffect(() => {
    hasUnsavedChangesRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!hasUnsavedChangesRef.current || allowNavigationRef.current) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    }

    function handleDocumentClick(event: MouseEvent) {
      if (!hasUnsavedChangesRef.current || allowNavigationRef.current || event.defaultPrevented) {
        return;
      }

      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;

      if (!(target instanceof HTMLAnchorElement) || target.target || target.hasAttribute("download")) {
        return;
      }

      const nextUrl = new URL(target.href);
      const currentUrl = new URL(window.location.href);
      const onlyHashChanged =
        nextUrl.origin === currentUrl.origin &&
        nextUrl.pathname === currentUrl.pathname &&
        nextUrl.search === currentUrl.search &&
        nextUrl.hash !== currentUrl.hash;

      if (onlyHashChanged || nextUrl.href === currentUrl.href) {
        return;
      }

      if (!window.confirm(UNSAVED_CHANGES_MESSAGE)) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      allowNavigationRef.current = true;
    }

    function handlePopState() {
      if (!hasUnsavedChangesRef.current || allowNavigationRef.current) {
        return;
      }

      if (window.confirm(UNSAVED_CHANGES_MESSAGE)) {
        allowNavigationRef.current = true;
        return;
      }

      window.history.forward();
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleDocumentClick, true);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleDocumentClick, true);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);
}

function SectionEditor({
  section,
  bodyPlaceholder,
  onChange,
  chunksById,
  removeDisabled = false,
  onRemove,
  onSelectSource
}: {
  section: Section;
  bodyPlaceholder?: string;
  onChange: (field: "heading" | "body", value: string) => void;
  chunksById: ReadonlyMap<number, Pick<SourceChunk, "content" | "position">>;
  removeDisabled?: boolean;
  onRemove?: () => void;
  onSelectSource: (id: number) => void;
}) {
  return (
    <div>
      <div className={onRemove ? "grid grid-cols-[1fr_40px] gap-2" : ""}>
        <input
          className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-slate-500"
          value={section.heading}
          onChange={(event) => onChange("heading", event.target.value)}
        />
        {onRemove ? (
          <RemoveItemButton
            disabled={removeDisabled}
            label={`Remove ${section.heading || "article section"}`}
            onClick={onRemove}
          />
        ) : null}
      </div>
      <textarea
        className="mt-3 min-h-40 w-full rounded-md border border-border bg-white px-3 py-3 text-sm leading-6 outline-none placeholder:text-muted-foreground focus:border-slate-500"
        value={section.body}
        placeholder={bodyPlaceholder}
        onChange={(event) => onChange("body", event.target.value)}
      />
      <SourceRefs ids={section.sourceChunkIds} chunksById={chunksById} onSelectSource={onSelectSource} />
    </div>
  );
}

function EmptySectionEditor({
  heading,
  placeholder,
  onCreate
}: {
  heading: string;
  placeholder: string;
  onCreate: (heading: string, body: string) => void;
}) {
  return (
    <div>
      <input
        className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-slate-500"
        value={heading}
        onChange={(event) => onCreate(event.target.value, "")}
      />
      <textarea
        className="mt-3 min-h-40 w-full rounded-md border border-border bg-white px-3 py-3 text-sm leading-6 outline-none placeholder:text-muted-foreground focus:border-slate-500"
        value=""
        placeholder={placeholder}
        onChange={(event) => onCreate(heading, event.target.value)}
      />
    </div>
  );
}

function TagFactList({
  facts,
  chunksById,
  onChange,
  onCreate,
  onRemove,
  onSelectSource,
  placeholder
}: {
  facts: IndexedFact[];
  chunksById: ReadonlyMap<number, Pick<SourceChunk, "content" | "position">>;
  onChange: (index: number, value: string) => void;
  onCreate: (value: string) => void;
  onRemove: (index: number) => void;
  onSelectSource: (id: number) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");
  const sourceChunkIds = uniqueSourceChunkIds(facts.flatMap(({ fact }) => fact.sourceChunkIds));

  function addTag() {
    const value = draft.trim();

    if (!value) {
      return;
    }

    onCreate(value);
    setDraft("");
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {facts.map(({ fact, index }) => (
          <div
            key={index}
            className="inline-flex w-fit max-w-full items-center gap-1 rounded-full border border-slate-200 bg-slate-50 py-1.5 pl-3 pr-2 text-sm text-slate-800"
          >
            <AutoSizeInput value={fact.value} onChange={(value) => onChange(index, value)} />
            <button
              type="button"
              className="shrink-0 rounded-full p-0.5 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900"
              onClick={() => onRemove(index)}
              aria-label={`Remove ${fact.value}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <input
        className="w-full max-w-xs rounded-md border border-border bg-white px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-slate-500"
        value={draft}
        placeholder={placeholder}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            addTag();
          }
        }}
      />
      <SourceRefs ids={sourceChunkIds} chunksById={chunksById} compact onSelectSource={onSelectSource} />
    </div>
  );
}

function AutoSizeInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <span className="inline-grid w-fit min-w-[1ch] max-w-full">
      <span className="invisible col-start-1 row-start-1 whitespace-pre" aria-hidden="true">
        {value || " "}
      </span>
      <input
        className="col-start-1 row-start-1 w-full min-w-0 bg-transparent outline-none"
        size={1}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </span>
  );
}

function FactList({
  facts,
  chunksById,
  onChange,
  onCreate,
  onAdd,
  onRemove,
  onSelectSource,
  emptyPlaceholder = "Add a note from the uploaded material...",
  hideLabels = false
}: {
  facts: IndexedFact[];
  chunksById: ReadonlyMap<number, Pick<SourceChunk, "content" | "position">>;
  onChange: (index: number, field: "label" | "value", value: string) => void;
  onCreate: (label: string, value: string) => void;
  onAdd?: () => void;
  onRemove?: (index: number) => void;
  onSelectSource: (id: number) => void;
  emptyPlaceholder?: string;
  hideLabels?: boolean;
}) {
  const visibleFacts =
    facts.length === 0
      ? [{ fact: { label: hideLabels ? "Safety notes" : "Fact", value: "", sourceChunkIds: [] }, index: -1 }]
      : facts;

  return (
    <div className="space-y-4">
      {visibleFacts.map(({ fact, index }, rowIndex) => (
        <div key={`fact-row-${rowIndex}`}>
          <div
            className={
              hideLabels
                ? onRemove
                  ? "grid grid-cols-[1fr_40px] gap-3"
                  : "grid grid-cols-1 gap-3"
                : onRemove
                  ? "grid grid-cols-1 gap-3 md:grid-cols-[190px_1fr_40px]"
                  : "grid grid-cols-1 gap-3 md:grid-cols-[190px_1fr]"
            }
          >
            {hideLabels ? null : (
              <input
                className="rounded-md border border-border bg-white px-3 py-2 text-sm font-semibold text-slate-950 outline-none focus:border-slate-500"
                value={fact.label}
                onChange={(event) => {
                  if (index === -1) {
                    onCreate(event.target.value, fact.value);
                  } else {
                    onChange(index, "label", event.target.value);
                  }
                }}
              />
            )}
            <input
              className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
              value={fact.value}
              placeholder={emptyPlaceholder}
              onChange={(event) => {
                if (index === -1) {
                  onCreate(fact.label, event.target.value);
                } else {
                  onChange(index, "value", event.target.value);
                }
              }}
            />
            {onRemove ? (
              <RemoveItemButton
                disabled={index === -1}
                label={`Remove ${fact.label || "fact"}`}
                onClick={() => {
                  if (index !== -1) {
                    onRemove(index);
                  }
                }}
              />
            ) : null}
          </div>
          <SourceRefs ids={fact.sourceChunkIds} chunksById={chunksById} compact onSelectSource={onSelectSource} />
        </div>
      ))}
      {onAdd ? <AddItemButton label="Add extracted fact" onClick={onAdd} /> : null}
    </div>
  );
}

function SourceRefs({
  ids,
  chunksById,
  compact = false,
  onSelectSource
}: {
  ids: number[];
  chunksById: ReadonlyMap<number, Pick<SourceChunk, "content" | "position">>;
  compact?: boolean;
  onSelectSource?: (id: number) => void;
}) {
  if (ids.length === 0) {
    return null;
  }

  return (
    <div className={compact ? "mt-2 flex flex-wrap gap-1" : "mt-3 flex flex-wrap gap-2"}>
      {ids.map((id) => (
        <button
          key={id}
          type="button"
          className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600 transition hover:border-slate-300 hover:bg-slate-100"
          onClick={() => onSelectSource?.(id)}
          title={previewSource(chunksById.get(id)?.content)}
        >
          Note {chunksById.get(id)?.position ?? id}
        </button>
      ))}
    </div>
  );
}

type IndexedFact = {
  fact: KeyFact;
  index: number;
};

type WarningGroupKey = "title" | "facts" | "hookIntro" | "bestFor" | "notFor" | "ethicsSafety" | "magazineDraft";

function groupFacts(keyFacts: KeyFact[]) {
  const groups = {
    general: [] as IndexedFact[],
    bestFor: [] as IndexedFact[],
    notFor: [] as IndexedFact[],
    ethicsSafety: [] as IndexedFact[]
  };

  keyFacts.forEach((fact, index) => {
    const text = `${fact.label} ${fact.value}`.toLowerCase();
    const indexed = { fact, index };

    if (matchesAny(text, ["not for", "not ideal", "avoid", "unsuitable", "not suitable"])) {
      groups.notFor.push(indexed);
    } else if (matchesAny(text, ["best for", "target audience", "ideal for", "good for", "suited for"])) {
      groups.bestFor.push(indexed);
    } else if (matchesAny(text, ["safety", "ethic", "sustainability", "risk", "wildlife", "current", "coral"])) {
      groups.ethicsSafety.push(indexed);
    } else {
      groups.general.push(indexed);
    }
  });

  return groups;
}

function groupWarnings(warnings: Warning[]) {
  const groups: Record<WarningGroupKey, Warning[]> = {
    title: [],
    facts: [],
    hookIntro: [],
    bestFor: [],
    notFor: [],
    ethicsSafety: [],
    magazineDraft: []
  };

  warnings.forEach((warning) => {
    groups[getWarningGroup(warning.message)].push(warning);
  });

  return groups;
}

function getWarningGroup(message: string): WarningGroupKey {
  const text = message.toLowerCase();

  if (matchesAny(text, ["title", "headline"])) {
    return "title";
  }

  if (matchesAny(text, ["safety", "ethic", "sustainability", "responsible", "wildlife", "coral", "reef", "risk"])) {
    return "ethicsSafety";
  }

  if (matchesAny(text, ["best for", "audience", "ideal for", "suited", "family", "couple", "group"])) {
    return "bestFor";
  }

  if (matchesAny(text, ["intro", "overview", "comfort", "context", "unclear angle"])) {
    return "hookIntro";
  }

  if (matchesAny(text, ["not for", "avoid", "unsuitable", "not suitable", "mobility", "accessibility", "strenuous"])) {
    return "notFor";
  }

  if (matchesAny(text, ["draft", "section", "body", "article", "narrative", "publish"])) {
    return "magazineDraft";
  }

  return "facts";
}

function getWarningKey(warning: Warning) {
  return `${warning.message}:${warning.sourceChunkIds.join(",")}`;
}

function matchesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

function uniqueSourceChunkIds(ids: number[]) {
  return Array.from(new Set(ids));
}

function previewSource(content?: string) {
  if (!content) {
    return undefined;
  }

  const singleLine = content.replace(/\s+/g, " ").trim();
  return singleLine.length > 180 ? `${singleLine.slice(0, 177)}...` : singleLine;
}

function formatRelativeUpdate(value: string) {
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));

  if (elapsedSeconds < 60) {
    return "just now";
  }

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);

  if (elapsedMinutes < 60) {
    return `${elapsedMinutes} min${elapsedMinutes === 1 ? "" : "s"} ago`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);

  if (elapsedHours < 24) {
    return `${elapsedHours} hour${elapsedHours === 1 ? "" : "s"} ago`;
  }

  const elapsedDays = Math.floor(elapsedHours / 24);

  if (elapsedDays < 7) {
    return `${elapsedDays} day${elapsedDays === 1 ? "" : "s"} ago`;
  }

  return formatDateTime(value);
}
