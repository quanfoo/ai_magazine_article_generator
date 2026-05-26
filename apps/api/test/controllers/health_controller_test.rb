require "test_helper"

class HealthControllerTest < ActionDispatch::IntegrationTest
  def test_root_returns_ok
    get root_path

    assert_response :success
    assert_equal({ "status" => "ok" }, JSON.parse(response.body))
  end

  def test_up_returns_ok
    get up_path

    assert_response :success
    assert_equal({ "status" => "ok" }, JSON.parse(response.body))
  end
end
