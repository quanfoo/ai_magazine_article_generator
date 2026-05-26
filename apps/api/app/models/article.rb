class Article < ApplicationRecord
  STATUSES = %w[draft saved failed].freeze

  has_many :source_chunks, -> { order(:position) }, dependent: :destroy

  validates :title, presence: true
  validates :status, inclusion: { in: STATUSES }

  def as_json(_options = {})
    {
      id: id,
      title: title,
      status: status,
      originalFilename: original_filename,
      sections: sections,
      keyFacts: key_facts,
      warnings: warnings,
      reviewedWarningIds: reviewed_warning_ids,
      claimSourceReferences: claim_source_references,
      sourceChunks: source_chunks.map(&:as_json),
      failureReason: failure_reason,
      createdAt: created_at,
      updatedAt: updated_at
    }
  end
end
