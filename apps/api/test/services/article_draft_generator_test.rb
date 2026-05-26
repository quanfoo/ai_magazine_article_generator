require "test_helper"

class ArticleDraftGeneratorTest < Minitest::Test
  Upload = Struct.new(:original_filename)

  def setup
    SourceChunk.delete_all
    Article.delete_all
  end

  def test_docx_text_is_split_into_numbered_source_chunks
    first_note = "Boat leaves Labuan Bajo at 9am. " * 40
    second_note = "Komodo dragons are seen with a ranger."
    raw_notes = "#{first_note}\n\n#{second_note}"

    stub_docx_text(raw_notes) do
      stub_generated_payload do
        article = ArticleDraftGenerator.new(upload: Upload.new("komodo.docx")).call

        assert_equal "draft", article.status
        assert_equal raw_notes, article.raw_text
        assert_equal [first_note.strip, second_note], article.source_chunks.map(&:content)
        assert_equal [1, 2], article.source_chunks.map(&:position)
      end
    end
  end

  private

  def stub_docx_text(raw_notes)
    stub_class_new(DocxTextExtractor, ->(_upload) { StubDocxTextExtractor.new(raw_notes) }) do
      yield
    end
  end

  def stub_generated_payload
    stub_class_new(LlmArticleGenerator, ->(chunks:) { StubLlmArticleGenerator.new(chunks) }) do
      yield
    end
  end

  def stub_class_new(klass, replacement)
    original = klass.method(:new)
    previous_verbose = $VERBOSE
    $VERBOSE = nil
    klass.define_singleton_method(:new, &replacement)
    $VERBOSE = previous_verbose
    yield
  ensure
    $VERBOSE = nil
    klass.define_singleton_method(:new, original)
    $VERBOSE = previous_verbose
  end

  class StubDocxTextExtractor
    def initialize(raw_notes)
      @raw_notes = raw_notes
    end

    def call
      @raw_notes
    end
  end

  class StubLlmArticleGenerator
    def initialize(chunks)
      @chunks = chunks
    end

    def call
      first_chunk_id = @chunks.first.fetch(:id)

      {
        "title" => "Komodo Boat Trip",
        "sections" => [{ "heading" => "What to expect", "body" => "A ranger-led Komodo visit.", "sourceChunkIds" => [first_chunk_id] }],
        "keyFacts" => [{ "label" => "Departure", "value" => "9am from Labuan Bajo", "sourceChunkIds" => [first_chunk_id] }],
        "warnings" => [],
        "claimSourceReferences" => [{ "claim" => "Boat leaves at 9am.", "sourceChunkIds" => [first_chunk_id] }]
      }
    end
  end
end
