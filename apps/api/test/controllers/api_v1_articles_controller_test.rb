require "test_helper"

class ApiV1ArticlesControllerTest < ActionDispatch::IntegrationTest
  setup do
    Article.delete_all
  end

  def test_reviewed_warning_is_saved_and_summary_warning_counts_are_updated
    reviewed_warning = { "message" => "Confirm the launch date.", "sourceChunkIds" => [101] }
    active_warning = { "message" => "Check the pricing claim.", "sourceChunkIds" => [102] }
    article = Article.create!(
      title: "AI Magazine draft",
      warnings: [reviewed_warning, active_warning]
    )

    patch api_v1_article_path(article),
          params: {
            article: {
              title: article.title,
              warnings: article.warnings,
              reviewed_warning_ids: [warning_key(reviewed_warning)]
            }
          },
          as: :json

    assert_response :success
    saved_article = JSON.parse(response.body)
    assert_equal [warning_key(reviewed_warning)], saved_article.fetch("reviewedWarningIds")

    get api_v1_articles_path

    assert_response :success
    summary = JSON.parse(response.body).find { |record| record.fetch("id") == article.id }

    assert_equal 1, summary.fetch("warningsCount")
    assert_equal 1, summary.fetch("reviewedWarningsCount")
  end

  private

  def warning_key(warning)
    "#{warning.fetch("message")}:#{warning.fetch("sourceChunkIds").join(",")}"
  end
end
