# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[7.1].define(version: 2026_05_26_000100) do
  create_table "articles", force: :cascade do |t|
    t.string "title", default: "Untitled draft", null: false
    t.string "status", default: "draft", null: false
    t.string "original_filename"
    t.text "raw_text"
    t.json "sections", default: [], null: false
    t.json "key_facts", default: [], null: false
    t.json "warnings", default: [], null: false
    t.json "claim_source_references", default: [], null: false
    t.text "failure_reason"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.json "reviewed_warning_ids", default: [], null: false
  end

  create_table "source_chunks", force: :cascade do |t|
    t.integer "article_id", null: false
    t.integer "position", null: false
    t.text "content", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["article_id", "position"], name: "index_source_chunks_on_article_id_and_position", unique: true
    t.index ["article_id"], name: "index_source_chunks_on_article_id"
  end

end
