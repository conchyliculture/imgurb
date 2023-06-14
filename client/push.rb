#!/usr/bin/ruby
# encoding: utf-8

require 'digest'
require 'json'
require 'net/http'
require 'tmpdir'

$config_file = File.join(File.expand_path(File.dirname(__FILE__)), 'config.json')

def load_config(path, default={})
  config = default
  if File.exist?(path)
    config = JSON.load(File.read(path))
  end
  return config
end

def save_config(path, data)
  File.open(path, 'w') do |f|
    f.write(data.to_json())
  end
end

def dohash(pwd)
  hex = pwd.strip()
  0.upto(1000) {
    hex = Digest::SHA2.hexdigest(hex)
  }
  return hex
end

def get_password()
  puts "Setting password:"
  pwd = gets().strip()
  return dohash(pwd)
end

def do_snip(dest_file)
  cmd = nil
  if File.exist?("/mnt/c/Windows/System32")
    cmd = ["powershell.exe", File.join(File.dirname(__FILE__).gsub('/mnt/c', 'C:/'), "..", "client-wsl", "snip.ps1"), dest_file]
  else
    if $settings['snip_cmd']
      cmd = $settings['snip_cmd']
    else
      case ENV["XDG_SESSION_TYPE"]
      when "wayland"
        [
          ['gnome-screenshot', '-a', '-f', dest_file]
        ].each do |c|
          if `which "#{c[0]}"` != ''
            cmd = c
            break
          end
        end
      else
        [
          ['maim', '-f', 'jpg', '-s' , dest_file],
          ['import', dest_file],
        ].each do |c|
          if `which "#{c[0]}"` != ''
            cmd = c
            break
          end
        end
      end #wayland?
    end # snip_cmd
  end #win

  if cmd
    puts "Running #{cmd.join(' ')}"
    return system(*cmd)
  else
    raise 'Could not run a screenshot tool. Try installing maim or imagemagick'
  end
end

def upload_path(file)
  uri = URI.parse($settings['upload_url'])
  req = Net::HTTP::Post.new(uri)
  req.set_form(
    [
      ['file', File.open(file)],
      ['secret', $settings['secret']]
    ],
    'multipart/form-data')
  res = nil
  Net::HTTP.start(uri.hostname, uri.port, :use_ssl => $settings['upload_url'].start_with?('https://')) do |http|
      res = http.request(req)
  end
  if res
    if res.code != "200"
      raise "Error connecting to #{uri} (code #{res.code})"
    end
    json = JSON.parse(res.body)
    if json["status"] == "error"
      raise "Error uploading.\nServer said: #{json["msg"]}"
    else
      return json['msg']
    end
  else
    raise "Error connecting to #{uri}"
  end
end

def take_screenshot(delay)
  puts "sleeping #{delay}s"
  sleep(delay)

  Dir::Tmpname.create('imgurb-screenshot') { |path|
    tempfile = path+'.jpg'
    do_snip(tempfile)
    dest_url = upload_path(tempfile)
    puts dest_url
  }
end

$settings = load_config(
  $config_file,
  {
    'upload_url' => 'http://localhost:4567/upload',
    'secret' => '',
    'delay' => 1
  }
)

if $settings['secret'] == ''
  $settings['secret'] = get_password()
  save_config($config_file, $settings)
  exit
end

delay = $settings['delay']

if ARGV[0] =~ /^(\d+)$/
  delay = $1.to_i
end

if ARGV[0] and File.exist?(ARGV[0])
    dest_url = upload_path(ARGV[0])
    puts dest_url
else
  take_screenshot(delay)
end
