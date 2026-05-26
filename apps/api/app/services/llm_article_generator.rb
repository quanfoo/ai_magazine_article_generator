require "json"
require "net/http"
require "openssl"
require "uri"

class LlmArticleGenerator
  MODEL = ENV.fetch("OPENAI_MODEL", "gpt-4.1-mini")
  OPEN_TIMEOUT_SECONDS = 10
  READ_TIMEOUT_SECONDS = 45
  RETRYABLE_RESPONSE_CODES = %w[429 500 502 503 504].freeze

  def initialize(chunks:)
    @chunks = chunks
  end

  def call
    api_key = ENV["OPENAI_API_KEY"]
    raise ArgumentError, "OPENAI_API_KEY is not configured." if api_key.blank?

    uri = URI("https://api.openai.com/v1/responses")
    request = Net::HTTP::Post.new(uri)
    request["Authorization"] = "Bearer #{api_key}"
    request["Content-Type"] = "application/json"
    request.body = request_body.to_json

    response = perform_request(uri, request)
    unless response.is_a?(Net::HTTPSuccess)
      detail = parse_error_message(response.body)
      raise ArgumentError, "The LLM provider could not generate a draft. Please try to edit this manually.#{detail}"
    end

    body = JSON.parse(response.body)
    JSON.parse(extract_output_text(body))
  rescue JSON::ParserError => e
    raise ArgumentError, "LLM returned invalid JSON: #{e.message}"
  rescue Net::OpenTimeout, Net::ReadTimeout
    raise ArgumentError, "LLM request timed out after #{READ_TIMEOUT_SECONDS} seconds."
  rescue OpenSSL::SSL::SSLError => e
    Rails.logger.warn("LLM SSL connection failed: #{e.message}")
    raise ArgumentError, "The drafting service could not securely connect to the LLM provider. Please check your network or try again later."
  end

  private

  def perform_request(uri, request)
    attempts = 0

    loop do
      attempts += 1
      response = Net::HTTP.start(
        uri.hostname,
        uri.port,
        use_ssl: true,
        open_timeout: OPEN_TIMEOUT_SECONDS,
        read_timeout: READ_TIMEOUT_SECONDS,
        cert_store: cert_store
      ) { |http| http.request(request) }

      if RETRYABLE_RESPONSE_CODES.include?(response.code) && attempts < 3
        sleep(0.5 * attempts)
        next
      end

      return response
    end
  end

  def cert_store
    store = OpenSSL::X509::Store.new
    store.set_default_paths
    # Some local OpenSSL builds require CRLs for public CAs and fail before the request reaches OpenAI.
    store.flags = 0
    store
  end

  def parse_error_message(body)
    parsed = JSON.parse(body)
    request_id = parsed.dig("error", "message").to_s[/request ID ([\w-]+)/, 1]
    request_id.present? ? " OpenAI request ID: #{request_id}." : ""
  rescue JSON::ParserError
    ""
  end

  def request_body
    {
      model: MODEL,
      input: [
        {
          role: "system",
          content: "Return strict JSON only. Do not invent missing facts. Add warnings instead of guessing. Every important claim and extracted fact must reference sourceChunkIds."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "article_draft",
          strict: true,
          schema: schema
        }
      }
    }
  end

  def prompt
    <<~PROMPT
      Create a structured magazine article draft for a travel marketplace from these source chunks.

      Source chunks:
      #{JSON.pretty_generate(@chunks)}
    PROMPT
  end

  def schema
    {
      type: "object",
      additionalProperties: false,
      required: %w[title sections keyFacts warnings claimSourceReferences],
      properties: {
        title: { type: "string" },
        sections: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: %w[heading body sourceChunkIds],
            properties: {
              heading: { type: "string" },
              body: { type: "string" },
              sourceChunkIds: { type: "array", items: { type: "integer" } }
            }
          }
        },
        keyFacts: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: %w[label value sourceChunkIds],
            properties: {
              label: { type: "string" },
              value: { type: "string" },
              sourceChunkIds: { type: "array", items: { type: "integer" } }
            }
          }
        },
        warnings: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: %w[message sourceChunkIds],
            properties: {
              message: { type: "string" },
              sourceChunkIds: { type: "array", items: { type: "integer" } }
            }
          }
        },
        claimSourceReferences: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: %w[claim sourceChunkIds],
            properties: {
              claim: { type: "string" },
              sourceChunkIds: { type: "array", items: { type: "integer" } }
            }
          }
        }
      }
    }
  end

  def extract_output_text(body)
    return body["output_text"] if body["output_text"].present?

    body.fetch("output").each do |item|
      item.fetch("content", []).each do |content|
        return content["text"] if content["type"] == "output_text" && content["text"].present?
      end
    end

    raise ArgumentError, "LLM response did not include output text."
  end
end
