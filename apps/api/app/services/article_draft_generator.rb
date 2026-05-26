class ArticleDraftGenerator
  def initialize(upload:)
    @upload = upload
  end

  def call
    article = Article.create!(
      title: "Processing #{upload_name}",
      status: "draft",
      original_filename: upload_name
    )

    raw_text = DocxTextExtractor.new(@upload).call
    chunks = SourceChunker.new(raw_text).call
    raise ArgumentError, "No readable text was found in the .docx file." if chunks.empty?

    article.update!(raw_text: raw_text)
    chunk_records = chunks.each_with_index.map do |content, index|
      article.source_chunks.create!(position: index + 1, content: content)
    end

    chunk_payload = chunk_records.map { |chunk| { id: chunk.id, content: chunk.content } }
    draft = LlmArticleGenerator.new(chunks: chunk_payload).call
    ArticleSchemaValidator.new(payload: draft, source_chunk_ids: chunk_records.map(&:id)).call

    article.update!(
      title: draft["title"].presence || "Untitled draft",
      status: "draft",
      sections: draft["sections"],
      key_facts: draft["keyFacts"],
      warnings: draft["warnings"],
      claim_source_references: draft["claimSourceReferences"]
    )

    article
  rescue StandardError => e
    article ||= Article.create!(title: "Failed upload", status: "failed", original_filename: upload_name)
    article.update!(status: "failed", failure_reason: e.message)
    article
  end

  private

  def upload_name
    @upload.original_filename.to_s.presence || "uploaded.docx"
  end
end

