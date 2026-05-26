class CreateSourceChunks < ActiveRecord::Migration[7.1]
  def change
    create_table :source_chunks do |t|
      t.references :article, null: false, foreign_key: true
      t.integer :position, null: false
      t.text :content, null: false

      t.timestamps
    end

    add_index :source_chunks, %i[article_id position], unique: true
  end
end

