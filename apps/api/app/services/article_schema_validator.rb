class ArticleSchemaValidator
  REQUIRED_KEYS = %w[title sections keyFacts warnings claimSourceReferences].freeze

  def initialize(payload:, source_chunk_ids:)
    @payload = payload
    @source_chunk_ids = source_chunk_ids
  end

  def call
    raise ArgumentError, "LLM response must be a JSON object." unless @payload.is_a?(Hash)

    missing = REQUIRED_KEYS - @payload.keys
    raise ArgumentError, "LLM response missing keys: #{missing.join(', ')}" if missing.any?

    validate_array!("sections")
    validate_array!("keyFacts")
    validate_array!("warnings")
    validate_array!("claimSourceReferences")
    validate_source_references!

    true
  end

  private

  def validate_array!(key)
    raise ArgumentError, "#{key} must be an array." unless @payload[key].is_a?(Array)
  end

  def validate_source_references!
    records = @payload["sections"] + @payload["keyFacts"] + @payload["warnings"] + @payload["claimSourceReferences"]
    records.each do |record|
      ids = record["sourceChunkIds"]
      raise ArgumentError, "Every claim-like record must include sourceChunkIds." unless ids.is_a?(Array) && ids.any?

      invalid = ids - @source_chunk_ids
      raise ArgumentError, "Unknown sourceChunkIds: #{invalid.join(', ')}" if invalid.any?
    end
  end
end

