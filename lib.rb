require 'digest'
require 'json'

def dohash(pwd)
  hex = pwd.strip()
  0.upto(1000) {
    hex = Digest::SHA2.hexdigest(hex) 
  }
  return hex
end

def load_config(path, default={})
  config = default
  if File.exist?(path)
    config = JSON.load(File.read(path))
  end
  return config
end

def get_password()
  puts "Setting password:"
  pwd = gets().strip()
  return dohash(pwd)
end

def save_config(path, data)
  File.open(path, 'w') do |f|
    f.write(data.to_json())
  end
end
