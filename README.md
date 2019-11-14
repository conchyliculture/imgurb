# imgurb

Easily take screenshots & upload them somewhere (Linux only).

No real security, once someone figures out your password, or intercepts its hashed version, anyone can upload to your server lol!

## Installation

```
git clone https://github.com/conchyliculture/imgurb
```

Taking screenshots is done using either `import` from `imagemagick` package, or `maim`. Please install onf of these.

The server requires you install [Sinatra](http://sinatrarb.com/).

### Server

Start the server & update the config.json file.

```
$ ruby server/index.rb
Setting password:
qsd
```

Change value for `my_url` to be the URL at which your server can be joined.
```
$ cat server/config.json 
{"my_url":"http://localhost:4567","secret":"f56ce90cd79e038e237ab7f8b89e804b5ebf59be8cda49fa97ca2da997ab2f5a","pics_dir":"pics"}
```

Then restart the server, which by default listens on localhost, port 4567. I otherwise use [Puma](https://github.com/puma/puma) for some semi-proper webservering.
```
$ ruby server/index.rb
[2019-11-14 12:58:24] INFO  WEBrick 1.4.2
[2019-11-14 12:58:24] INFO  ruby 2.5.7 (2019-10-01) [x86_64-linux-gnu]
== Sinatra (v2.0.5) has taken the stage on 4567 for development with backup from WEBrick
[2019-11-14 12:58:24] INFO  WEBrick::HTTPServer#start: pid=18658 port=4567
```


### Client

Start the client & update the config.json file.

```
$ ruby client/push.rb
Setting password:
bad_password
```

Change value for `upload_url`:
```
$ cat client/config.json
{"upload_url":"http://localhost:4567/upload","secret":"ad96002c8fe486a6ba924379e46d3b5b7a78bd80ddb56c935e823b0b33bca1d3","delay":1}
```

You can also set the default delay before taking a screenshot here.

Then run again:
```
$ ruby client/push.rb
Running import /tmp/imgurb-screenshot20191114-19016-11l4n0j.jpg
https://localhost:4567/p/2242eeab.jpg
```
You screenshot is available at that last URL
