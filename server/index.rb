#!/usr/bin/ruby
# encoding: utf-8

Encoding.default_external = Encoding::UTF_8

require 'digest'
require 'json'
require 'sinatra'
require 'slim'

$config_file = 'config.json'

def dohash(pwd)
  hex = pwd.strip()
  0.upto(1000) {
    hex = Digest::SHA2.hexdigest(hex) 
  }
  return hex
end

if File.exist?($config_file)
  $settings = JSON.load(File.read($config_file))
else
  $settings = {
    'secret' => '',
    'pics_dir' => 'pics'
  }
end

if $settings['secret'] == ''
  puts "Setting password:"
  pwd = gets().strip()
  $settings['secret'] = dohash(pwd)

  File.open($config_file, 'w') do |f|
    f.write($settings.to_json())
  end
end

def check(pwd)
  return dohash(pwd) == $settings['secret']
end

def rndstr(length)
  rand(36**length).to_s(36)
end

def json_msg(msg)
    content_type 'application/json', :charset => 'utf-8'
    return {
      'status'=> 'ok',
      'msg'=> msg
    }.to_json
end

def json_error(error)
    content_type 'application/json', :charset => 'utf-8'
    return {
      'status'=> 'error',
      'msg'=> error
    }.to_json
end

def gen_filename(f)
  ext = File.extname(f)
  ext = 'jpg' if ext == ''
  base = File.basename(f, ext)
  dest = base
  begin
    dest = Digest::MD5.hexdigest(dest)[7..14]
  end while File.exist?(File.join($settings['pics_dir'], dest+'.'+ext))
  return dest+'.'+ext
end

get '/' do
	slim :index
end

get '/p/:pic' do
  if not params[:pic]
    status 404
  end
  path = File.join($settings['pics_dir'], params[:pic])
  if File.exist?(path)
    send_file(path)
  else
    status 404
  end
end

post '/upload' do
  pp params
  if params[:file]
    filename = params[:file][:filename]
    file = params[:file][:tempfile]

    dest_file = gen_filename(filename)
    File.open(File.join($settings['pics_dir'], dest_file), 'wb') do |f|
      f.write file.read
    end
    json_msg dest_file 
  else
    json_error 'You have to choose a file'
  end
end
