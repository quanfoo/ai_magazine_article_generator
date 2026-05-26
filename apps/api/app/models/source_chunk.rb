class SourceChunk < ApplicationRecord
  belongs_to :article

  validates :position, presence: true
  validates :content, presence: true

  def as_json(_options = {})
    {
      id: id,
      position: position,
      content: content
    }
  end
end

