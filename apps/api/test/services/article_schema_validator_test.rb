require "test_helper"

class ArticleSchemaValidatorTest < Minitest::Test
  def test_invalid_generated_article_payload_is_rejected
    payload = {
      "title" => "Komodo Boat Trip",
      "sections" => [{ "heading" => "What to expect", "body" => "A ranger-led Komodo visit." }],
      "keyFacts" => [],
      "warnings" => [],
      "claimSourceReferences" => []
    }

    error = assert_raises(ArgumentError) do
      ArticleSchemaValidator.new(payload: payload, source_chunk_ids: [1]).call
    end

    assert_equal "Every claim-like record must include sourceChunkIds.", error.message
  end
end
