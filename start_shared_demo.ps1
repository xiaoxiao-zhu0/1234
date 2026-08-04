param(
    [ValidateRange(1024, 65535)]
    [int]$Port = 8766
)

$shareRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$url = "http://127.0.0.1:$Port/"

Write-Host "北斗巡知共享前端已准备启动" -ForegroundColor Cyan
Write-Host "访问地址: $url" -ForegroundColor Green
Write-Host "请保持此窗口开启；按 Ctrl+C 停止服务。" -ForegroundColor Yellow
Write-Host ""

python -m http.server $Port --bind 127.0.0.1 --directory $shareRoot

