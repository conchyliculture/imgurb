#!/usr/bin/ruby

require 'digest'
require 'json'
require 'net/http'
require 'tmpdir'

class ImgurbClient
  attr_accessor :delay

  def initialize(config_file = File.join(File.expand_path(__dir__), 'config.json'))
    @config_file = config_file
    @upload_url = 'http://localhost:4567/upload'
    @secret = ''
    @snip_cmd = nil
    @delay = 1
    if File.exist?(config_file)
      config = JSON.parse(File.read(@config_file))
      @upload_url = config['upload_url'] if config['upload_url']
      @secret = config['secret'] if config['secret']
      @delay = config['delay'] if config['delay']
      @snip_cmd = config['snip_cmd'] if config['snip_cmd']
    end

    if @secret == ''
      @secret = get_password()
      save_config()
      exit
    end
  end

  def save_config()
    File.open(@config_file, 'w') do |f|
      f.write({
        'upload_url' => @upload_url,
        'secret' => @secret,
        'delay' => @delay,
        'snip_cmd' => @snip_cmd
      }.to_json())
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
    cmd = [@snip_cmd, dest_file]
    if File.exist?("/mnt/c/Windows/System32")
      cmd = ["powershell.exe", File.join(File.dirname(__FILE__).gsub('/mnt/c', 'C:/'), "..", "client-wsl", "snip.ps1"), dest_file]
    elsif cmd[0].nil?
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
          ['maim', '-f', 'jpg', '-s', dest_file],
          ['import', dest_file]
        ].each do |c|
          if `which "#{c[0]}"` != ''
            cmd = c
            break
          end
        end
      end
    end

    if cmd
      puts "Running #{cmd.join(' ')}"
      return system(*cmd)
    else
      raise 'Could not run a screenshot tool. Try installing maim or imagemagick'
    end
  end

  def upload_path(file)
    uri = URI.parse(@upload_url)
    req = Net::HTTP::Post.new(uri)
    req.set_form(
      [
        ['file', File.open(file)],
        ['secret', @secret]
      ],
      'multipart/form-data'
    )
    res = nil
    Net::HTTP.start(uri.hostname, uri.port, use_ssl: @upload_url.start_with?('https://')) do |http|
      res = http.request(req)
    end
    if res
      raise "Error connecting to #{uri} (code #{res.code})" if res.code != "200"

      json = JSON.parse(res.body)
      if json["status"] == "error"
        raise "Error uploading.\nServer said: #{json['msg']}"
      else
        return json['msg']
      end
    else
      raise "Error connecting to #{uri}"
    end
  end

  def take_screenshot()
    dest_url = nil
    puts "sleeping #{@delay}s"
    sleep(@delay)

    Dir::Tmpname.create('imgurb-screenshot') { |path|
      tempfile = "#{path}.jpg"
      do_snip(tempfile)
      dest_url = upload_path(tempfile)
    }
    return dest_url
  end
end

i = ImgurbClient.new()

if ARGV[0] and File.exist?(ARGV[0])
  dest_url = i.upload_path(ARGV[0])
else
  dest_url = i.take_screenshot()
end
puts dest_url
