#!/usr/bin/ruby
# encoding: utf-8

require 'net/http'
require 'tmpdir'

require_relative '../lib.rb'

$config_file = 'config.json'

$settings = load_config(
  $config_file,
  {
    'upload_url' => 'http://localhost:4567/upload',
    'secret' => '',
  }
)

if $settings['secret'] == ''
  $settings['secret'] = get_password()
  save_config($config_file, $settings)
end

def do_snip(dest_file)
  cmd = nil
  if $settings['snip_cmd']
    cmd = $settings['snip_cmd']
  else
    [
      ['import', dest_file],
      ['maim', '-f', 'jpg', '-s' , dest_file]
    ].each do |c|
      if `which "#{c[0]}"` != ''
        cmd = c
        break
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

Dir::Tmpname.create('imgurb-screenshot') { |path|
  tempfile = path+'.jpg'
  do_snip(tempfile)
  dest_url = upload_path(tempfile)
  puts dest_url
}
