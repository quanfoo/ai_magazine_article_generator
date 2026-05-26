class AddReviewedWarningIdsToArticles < ActiveRecord::Migration[7.1]
  def change
    add_column :articles, :reviewed_warning_ids, :json, null: false, default: []
  end
end
