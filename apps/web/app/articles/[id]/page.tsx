import { ArticleEditor } from "./review-client";
import { getArticle } from "@/lib/api";
import type { Metadata } from "next";

type ArticlePageProps = {
  params: Promise<{ id: string }>;
};

function getBrowserTitle(title: string) {
  return `Article - ${title.trim() || "Untitled article"}`;
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { id } = await params;
  const article = await getArticle(id);

  return {
    title: getBrowserTitle(article.title)
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { id } = await params;
  const article = await getArticle(id);
  return <ArticleEditor initialArticle={article} />;
}
