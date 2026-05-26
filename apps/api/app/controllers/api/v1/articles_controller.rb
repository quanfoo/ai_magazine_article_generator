module Api
  module V1
    class ArticlesController < ApplicationController
      def index
        articles = Article.order(updated_at: :desc)
        render json: articles.map { |article| summary_json(article) }
      end

      def show
        render json: Article.find(params[:id])
      end

      def create
        upload = params.require(:file)

        article = ArticleDraftGenerator.new(upload: upload).call

        render json: article, status: :created
      rescue ActionController::ParameterMissing
        render json: { error: "Upload a .docx file." }, status: :bad_request
      end

      def manual
        article = Article.create!(
          title: manual_article_title,
          status: "draft"
        )

        render json: article, status: :created
      rescue ActiveRecord::RecordInvalid => e
        render json: { error: e.record.errors.full_messages.to_sentence }, status: :unprocessable_entity
      end

      def update
        article = Article.find(params[:id])
        article.update!(article_params.merge(status: "saved"))

        render json: article
      rescue ActiveRecord::RecordInvalid => e
        render json: { error: e.record.errors.full_messages.to_sentence }, status: :unprocessable_entity
      end

      def destroy
        Article.find(params[:id]).destroy!

        head :no_content
      end

      private

      def manual_article_title
        params.dig(:article, :title).to_s.strip.presence || "Untitled draft"
      end

      def article_params
        params.require(:article).permit(
          :title,
          sections: [:heading, :body, { sourceChunkIds: [] }],
          key_facts: [:label, :value, { sourceChunkIds: [] }],
          warnings: [:message, { sourceChunkIds: [] }],
          reviewed_warning_ids: [],
          claim_source_references: [:claim, { sourceChunkIds: [] }]
        )
      end

      def summary_json(article)
        reviewed_warnings_count = article.warnings.count do |warning|
          article.reviewed_warning_ids.include?(warning_key(warning))
        end

        {
          id: article.id,
          title: article.title,
          status: article.status,
          originalFilename: article.original_filename,
          warningsCount: article.warnings.length - reviewed_warnings_count,
          reviewedWarningsCount: reviewed_warnings_count,
          createdAt: article.created_at,
          updatedAt: article.updated_at
        }
      end

      def warning_key(warning)
        "#{warning["message"]}:#{Array(warning["sourceChunkIds"]).join(",")}"
      end
    end
  end
end
