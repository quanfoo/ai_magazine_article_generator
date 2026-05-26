class CreateArticles < ActiveRecord::Migration[7.1]
  def change
    create_table :articles do |t|
      t.string :title, null: false, default: "Untitled draft"
      t.string :status, null: false, default: "draft"
      t.string :original_filename
      t.text :raw_text
      t.json :sections, null: false, default: []
      t.json :key_facts, null: false, default: []
      t.json :warnings, null: false, default: []
      t.json :claim_source_references, null: false, default: []
      t.text :failure_reason

      t.timestamps
    end
  end
end

