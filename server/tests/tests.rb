require "test/unit"
require_relative "../index"

class BaseTests < Test::Unit::TestCase
  def test_do_hash
    assert_equal '4c1699881ad78914bf9ead209c522726c86a7c87d7073f2a0a9da35becbd6749', dohash('tototutu')
  end
end
