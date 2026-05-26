Rails.application.routes.draw do
  root "health#show"
  get "up", to: "health#show"

  namespace :api do
    namespace :v1 do
      resources :articles, only: %i[index show create update destroy] do
        post :manual, on: :collection
      end
    end
  end
end
