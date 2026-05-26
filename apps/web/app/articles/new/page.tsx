"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, FilePenLine } from "lucide-react";
import { createManualArticle } from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function NewArticlePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    document.title = "Create manually";
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();

    setIsCreating(true);
    setError(null);

    try {
      const article = await createManualArticle(title);
      router.push(`/articles/${article.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create article.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <Button asChild variant="ghost">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Articles
            </Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-10">
        <form onSubmit={onSubmit} className="rounded-lg border border-border bg-white p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold">Create manually</h1>
            <p className="mt-2 text-sm text-muted-foreground">Start a blank article draft and edit it directly.</p>
          </div>

          <label className="block text-sm font-medium text-slate-900" htmlFor="article-title">
            Title
          </label>
          <input
            id="article-title"
            className="mt-2 h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            onChange={(event) => {
              setTitle(event.target.value);
              setError(null);
            }}
            placeholder="Untitled draft"
            type="text"
            value={title}
          />

          {error ? <div className="mt-4 rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

          <div className="mt-6 flex justify-end">
            <Button disabled={isCreating}>
              <FilePenLine className="mr-2 h-4 w-4" />
              {isCreating ? "Creating..." : "Create draft"}
            </Button>
          </div>
        </form>
      </section>
    </main>
  );
}
