return unless Rails.env.development? || Rails.env.test?

env_path = Rails.root.join(".env")
return unless env_path.exist?

env_path.each_line do |line|
  stripped = line.strip
  next if stripped.empty? || stripped.start_with?("#")

  key, value = stripped.split("=", 2)
  next if key.nil? || value.nil? || ENV.key?(key)

  ENV[key] = value.delete_prefix("\"").delete_suffix("\"").delete_prefix("'").delete_suffix("'")
end

