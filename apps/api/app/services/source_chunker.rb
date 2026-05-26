class SourceChunker
  MAX_CHARS = 1_200

  def initialize(raw_text)
    @raw_text = raw_text.to_s
  end

  def call
    paragraphs.each_with_object([]) do |paragraph, chunks|
      if chunks.empty? || chunks.last.length + paragraph.length + 2 > MAX_CHARS
        chunks << paragraph
      else
        chunks[-1] = "#{chunks.last}\n\n#{paragraph}"
      end
    end
  end

  private

  def paragraphs
    @raw_text.split(/\n{2,}/).map(&:strip).reject(&:empty?)
  end
end

