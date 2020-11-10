$dest_file=$args[0]

C:\Windows\System32\SnippingTool.exe /clip

Start-Sleep 5
$img=get-Clipboard -format image
$img.save($dest_file)
