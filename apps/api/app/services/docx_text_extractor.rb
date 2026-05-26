require "zip"
require "rexml/document"

class DocxTextExtractor
  def initialize(upload)
    @upload = upload
  end

  def call
    raise ArgumentError, "Only .docx files are supported." unless docx?

    xml = nil
    Zip::File.open(@upload.tempfile.path) do |zip|
      entry = zip.find_entry("word/document.xml")
      raise ArgumentError, "The .docx file does not contain document text." unless entry

      xml = entry.get_input_stream.read
    end

    document = REXML::Document.new(xml)
    paragraphs = []
    document.elements.each("//w:p") do |paragraph|
      text = ""
      paragraph.elements.each(".//w:t") { |node| text << node.text.to_s }
      paragraphs << text.strip unless text.strip.empty?
    end

    paragraphs.join("\n\n")
  end

  private

  def docx?
    File.extname(@upload.original_filename.to_s).casecmp(".docx").zero?
  end
end

