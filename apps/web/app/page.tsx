import Link from "next/link";
import { FilePenLine, Upload } from "lucide-react";
import { ArticlesTable } from "@/app/articles-table";
import { listArticles } from "@/lib/api";
import { Button } from "@/components/ui/button";

export default async function ArticlesPage() {
  const articles = await listArticles().catch(() => []);

  return (
    <main className="min-h-screen">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-xl font-semibold">Travel Articles</h1>
            <p className="text-sm text-muted-foreground">AI-assisted editorial drafts with source grounding.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild>
              <Link href="/upload">
                <Upload className="mr-2 h-4 w-4" />
                Upload notes
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/articles/new">
                <FilePenLine className="mr-2 h-4 w-4" />
                Create manually
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-8">
        <ArticlesTable initialArticles={articles} />
      </section>
    </main>
  );
}
