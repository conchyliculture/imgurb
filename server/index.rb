#!/usr/bin/ruby
# encoding: utf-8

Encoding.default_external = Encoding::UTF_8

require 'digest'
require 'json'
require 'sinatra'

require_relative '../lib.rb'

$config_file = 'config.json'

$settings = load_config(
  $config_file,
  {
    'my_url' => 'http://localhost:4567',
    'secret' => '',
    'pics_dir' => 'pics'
  }
)

if $settings['secret'] == ''
  $settings['secret'] = get_password()
  save_config($config_file, $settings)
end

if not File.directory?($settings['pics_dir'])
  Dir.mkdir($settings['pics_dir'])
end

def check(pwd)
  return dohash(pwd) == $settings['secret']
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
  end while File.exist?(File.join($settings['pics_dir'], dest+ext))
  return dest+ext
end

get '/p/:pic' do
  if not params[:pic]
    halt 404
  end
  path = File.join($settings['pics_dir'], params[:pic])
  if File.exist?(path)
    send_file(path)
  else
    halt 404
  end
end

post '/upload' do
  if params[:secret]
    if params[:secret] != $settings['secret']
      halt 403, 'bad password'
    end
  else
    halt 403, 'bad password'
  end
  if params[:file]
    filename = params[:file][:filename]
    file = params[:file][:tempfile]

    dest_file = gen_filename(filename)
    File.open(File.join($settings['pics_dir'], dest_file), 'wb') do |f|
      f.write file.read
    end
    json_msg $settings['my_url'] + '/' + dest_file
  else
    json_error 'You have to choose a file'
  end
end
