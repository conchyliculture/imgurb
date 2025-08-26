#!/usr/bin/ruby

Encoding.default_external = Encoding::UTF_8

require 'base64'
require 'digest'
require 'json'
require "rack"
require 'securerandom'
require 'sinatra'
require 'slim'

session_secret = ENV['SESSION_SECRET']
unless session_secret
  secret_file = 'session_secret'
  if File.exist?(secret_file)
    session_secret = File.read(secret_file).strip()
  else
    session_secret = SecureRandom.alphanumeric(100)
    File.open(secret_file, 'w').write(session_secret)
  end
end

enable :sessions
set :session_secret, session_secret
set :session_options, {
  expire_after: 60 * 60 * 24 * 365
}

helpers do
  def logged_in?
    session[:logged_in] == true
  end

  def protected!(redir=nil)
    redirect "#{settings.options['my_url']}/login?redir=#{redir}" unless logged_in?
  end
end

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

def get_mime(filepath)
  output = `file -b --mime "#{filepath}"`
  return output.split('; ')[0]
end

def image?(filepath)
  return get_mime(filepath).start_with?('image/')
end

get '/e/:pic' do
  protected!("/e/#{params[:pic]}")
  halt 404 unless params[:pic]
  path = File.join(settings.options['pics_dir'], params[:pic])
  if File.exist?(path)
    if image?(path)
      slim :edit
    else
      return "#{path} is not an image"
    end
  else
    halt 404
  end
end

get '/login' do
  @redir = params[:redir]
  slim :login
end

post '/upload_edited' do
  protected!('')
  data_uri = params[:annotatedImage]
  filename = params[:filename]

  data = Base64.decode64(data_uri['data:image/png;base64'.length..-1])

  dest_file = write_file(filename, data)

  redirect "#{settings.options['my_url']}/p/#{dest_file}"
end

def write_file(filename, data)
  dest_file = gen_filename(filename, data)
  File.open(File.join(settings.options['pics_dir'], dest_file), 'wb') do |f|
    f.write data
  end
  return dest_file
end

post '/upload' do
  if params[:secret]
    unless Rack::Utils.secure_compare(params[:secret], settings.options['secret'])
      halt 403, 'bad password'
    end
  else
    halt 403, 'bad password'
  end
  if params[:file]
    filename = params[:file][:filename]
    file = params[:file][:tempfile]
    data = file.read()

    dest_file = write_file(filename, data)

    json_msg "#{settings.options['my_url']}/p/#{dest_file}"
  else
    json_error 'You have to choose a file'
  end
end

post '/login' do
  submitted_password = params['password']
  submitted_hash = dohash(submitted_password)

  redirect_to = params[:redir]

  if Rack::Utils.secure_compare(submitted_hash, settings.options['secret'])
    # Correct password
    session[:logged_in] = true

    session[:error] = nil
    redirect "#{settings.options['my_url']}#{redirect_to}"
  else
    # Incorrect password
    session[:error] = "Invalid password. Please try again."
    redirect "#{settings.options['my_url']}/login?redir=#{redirect_to}"
  end
end

get '*' do
  halt 404
end
