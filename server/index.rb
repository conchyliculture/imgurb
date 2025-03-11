#!/usr/bin/ruby

Encoding.default_external = Encoding::UTF_8

require 'digest'
require 'json'
require 'sinatra'

def dohash(pwd)
  hex = pwd.strip()
  0.upto(1000) {
    hex = Digest::SHA2.hexdigest(hex)
  }
  return hex
end

def load_config(path, default = {})
  config = default.dup
  if File.exist?(path)
    config = JSON.parse(File.read(path))
  end
  return config
end

def get_password()
  puts "Setting password:"
  pwd = gets().strip()
  return dohash(pwd)
end

def json_msg(msg)
  content_type 'application/json', charset: 'utf-8'
  return {
    'status' => 'ok',
    'msg' => msg
  }.to_json
end

def json_error(error)
  content_type 'application/json', charset: 'utf-8'
  return {
    'status' => 'error',
    'msg' => error
  }.to_json
end

def gen_filename(filename, data)
  generated_name = nil
  ext = File.extname(filename)
  ext = 'jpg' if ext == ''

  md5 = Digest::MD5.hexdigest(data)
  loop do
    hash = md5[7..14]
    generated_name = hash + ext
    break unless File.exist?(generated_name)

    md5 = Digest::MD5.hexdigest(md5)
  end

  return generated_name
end

CONFIG_DEFAULTS = {
  'my_url' => 'http://localhost:4567',
  'secret' => '',
  'pics_dir' => 'pics'
}.freeze

configure do
  config_file = File.join(File.expand_path(__dir__), 'config.json')
  options = load_config(config_file, CONFIG_DEFAULTS)
  if options['secret'] == ''
    options['secret'] = get_password()
    File.open(config_file, 'w') do |f|
      f.write(options.to_json())
    end
  end

  Dir.mkdir(options['pics_dir']) unless File.directory?(options['pics_dir'])

  set :options, options
end

get '/p/:pic' do
  halt 404 unless params[:pic]
  path = File.join(settings.options['pics_dir'], params[:pic])
  if File.exist?(path)
    send_file(path)
  else
    halt 404
  end
end

post '/upload' do
  if params[:secret]
    if params[:secret] != settings.options['secret']
      halt 403, 'bad password'
    end
  else
    halt 403, 'bad password'
  end
  if params[:file]
    filename = params[:file][:filename]
    file = params[:file][:tempfile]
    data = file.read()

    dest_file = gen_filename(filename, data)
    File.open(File.join(settings.options['pics_dir'], dest_file), 'wb') do |f|
      f.write data
    end
    json_msg "#{settings.options['my_url']}/p/#{dest_file}"
  else
    json_error 'You have to choose a file'
  end
end

get '*' do
  halt 404
end
