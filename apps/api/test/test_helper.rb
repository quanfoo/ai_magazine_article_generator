ENV["RAILS_ENV"] ||= "test"

require_relative "../config/environment"
require "minitest/autorun"

connection = ActiveRecord::Base.connection

if !connection.data_source_exists?("articles") || connection.migration_context.needs_migration?
  ActiveRecord::Schema.verbose = false
  load Rails.root.join("db/schema.rb")
end
