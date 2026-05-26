require_relative "boot"

require "rails"
require "active_model/railtie"
require "active_job/railtie"
require "active_record/railtie"
require "action_controller/railtie"
require "rack/cors"

Bundler.require(*Rails.groups)

module AiMagazineArticleGenerator
  class Application < Rails::Application
    config.load_defaults 7.1
    config.api_only = true
    config.active_record.schema_format = :ruby

    config.middleware.insert_before 0, Rack::Cors do
      allow do
        origins ENV.fetch("WEB_ORIGIN", "http://localhost:3000")
        resource "*", headers: :any, methods: %i[get post patch delete options]
      end
    end
  end
end
