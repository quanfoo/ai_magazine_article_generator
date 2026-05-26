FROM ruby:3.2.2-slim

WORKDIR /rails

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential libsqlite3-dev && \
    rm -rf /var/lib/apt/lists/*

COPY Gemfile Gemfile.lock* ./
RUN bundle install

COPY . .

EXPOSE 3001
CMD ["sh", "-c", "bundle exec rails db:prepare && bundle exec rails server -b 0.0.0.0 -p 3001"]
