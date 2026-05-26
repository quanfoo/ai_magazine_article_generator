"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UploadCloud } from "lucide-react";
import { uploadArticle } from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const canSubmit = Boolean(file) && !isUploading;

  useEffect(() => {
    document.title = "Upload notes";
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setError("Choose a .docx file first.");
      return;
    }

    setIsUploading(true);
    setError(null);
    try {
      const article = await uploadArticle(file);
      router.push(`/articles/${article.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploading(false);
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
            <h1 className="text-2xl font-semibold">Upload source notes</h1>
            <p className="mt-2 text-sm text-muted-foreground">Create a grounded article draft from a Word document.</p>
          </div>

          <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center hover:bg-slate-100">
            <UploadCloud className="mb-3 h-8 w-8 text-slate-500" />
            <span className="font-medium">{file ? file.name : "Choose a .docx file"}</span>
            <span className="mt-1 text-sm text-muted-foreground">Only Word documents are accepted.</span>
            <input
              className="sr-only"
              type="file"
              accept=".docx"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setError(null);
              }}
            />
          </label>

          {error ? <div className="mt-4 rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

          <div className="mt-6 flex justify-end">
            <Button disabled={!canSubmit}>{isUploading ? "Generating..." : "Generate draft"}</Button>
          </div>
        </form>
      </section>
    </main>
  );
}
