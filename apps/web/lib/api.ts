export type Status = "draft" | "saved" | "failed";

export type SourceChunk = {
  id: number;
  position: number;
  content: string;
};

export type Section = {
  heading: string;
  body: string;
  sourceChunkIds: number[];
};

export type KeyFact = {
  label: string;
  value: string;
  sourceChunkIds: number[];
};

export type Warning = {
  message: string;
  sourceChunkIds: number[];
};

export type ClaimReference = {
  claim: string;
  sourceChunkIds: number[];
};

export type ArticleSummary = {
  id: number;
  title: string;
  status: Status;
  originalFilename?: string;
  warningsCount: number;
  reviewedWarningsCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type Article = {
  id: number;
  title: string;
  status: Status;
  originalFilename?: string;
  sections: Section[];
  keyFacts: KeyFact[];
  warnings: Warning[];
  reviewedWarningIds: string[];
  claimSourceReferences: ClaimReference[];
  sourceChunks: SourceChunk[];
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const SERVICE_UNAVAILABLE_MESSAGE = "The drafting service is not ready yet. Please try again in a moment.";

async function apiFetch(input: string, init?: RequestInit) {
  try {
    return await fetch(input, init);
  } catch (error) {
    throw new Error(SERVICE_UNAVAILABLE_MESSAGE);
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload.error ?? payload.failureReason ?? response.statusText ?? "Request failed";
    throw new Error(`${message} (${response.status} ${response.url})`);
  }
  return payload as T;
}

export async function listArticles() {
  const response = await apiFetch(`${API_URL}/api/v1/articles`, { cache: "no-store" });
  return parseResponse<ArticleSummary[]>(response);
}

export async function getArticle(id: string) {
  const response = await apiFetch(`${API_URL}/api/v1/articles/${id}`, { cache: "no-store" });
  return parseResponse<Article>(response);
}

export async function uploadArticle(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await apiFetch(`${API_URL}/api/v1/articles`, { method: "POST", body: formData });
  return parseResponse<Article>(response);
}

export async function createManualArticle(title: string) {
  const response = await apiFetch(`${API_URL}/api/v1/articles/manual`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ article: { title } })
  });
  return parseResponse<Article>(response);
}

export async function saveArticle(article: Article) {
  const response = await apiFetch(`${API_URL}/api/v1/articles/${article.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      article: {
        title: article.title,
        sections: article.sections,
        key_facts: article.keyFacts,
        warnings: article.warnings,
        reviewed_warning_ids: article.reviewedWarningIds,
        claim_source_references: article.claimSourceReferences
      }
    })
  });
  return parseResponse<Article>(response);
}

export async function deleteArticle(id: number) {
  const response = await apiFetch(`${API_URL}/api/v1/articles/${id}`, { method: "DELETE" });
  return parseResponse<void>(response);
}
