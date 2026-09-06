Add-Type -AssemblyName System.Drawing

$srcPath = "c:\Users\linw2\daily-diet\public\richmenu-2500x1686.jpg"
$destPath = "c:\Users\linw2\daily-diet\public\richmenu-en-2500x1686.jpg"

$bmp = [System.Drawing.Bitmap]::FromFile($srcPath)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# Background color of the cards inside
$bgColor = [System.Drawing.Color]::FromArgb(248, 214, 55)
$brushBg = New-Object System.Drawing.SolidBrush($bgColor)
$brushText = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(18, 18, 18))

# Font
$fontFamily = "Arial Black"
$font = New-Object System.Drawing.Font($fontFamily, 64, [System.Drawing.FontStyle]::Bold)

# StringFormat to center text horizontally and vertically
$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = [System.Drawing.StringAlignment]::Center
$sf.LineAlignment = [System.Drawing.StringAlignment]::Center

# Exactly measured bounding boxes inside the cards to wipe all Chinese text cleanly
$cards = @(
    @{ X=90; Y=545; W=690; H=235; Text="AI CAMERA" },
    @{ X=895; Y=545; W=695; H=235; Text="FAVORITES" },
    @{ X=1715; Y=545; W=695; H=235; Text="+500ml WATER" },
    @{ X=90; Y=1325; W=690; H=255; Text="SUMMARY" },
    @{ X=895; Y=1325; W=695; H=255; Text="GUIDE" },
    @{ X=1715; Y=1325; W=695; H=255; Text="OPEN APP" }
)

foreach ($c in $cards) {
    # 1. Clear previous text with card background color
    $rect = New-Object System.Drawing.Rectangle($c.X, $c.Y, $c.W, $c.H)
    $g.FillRectangle($brushBg, $rect)

    # 2. Draw English text centered
    $rectF = New-Object System.Drawing.RectangleF($c.X, $c.Y, $c.W, $c.H)
    $g.DrawString($c.Text, $font, $brushText, $rectF, $sf)
}

# Save with high quality JPEG
$encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 98L)

$bmp.Save($destPath, $encoder, $encoderParams)

$g.Dispose()
$bmp.Dispose()

Write-Host "SUCCESS: Generated perfect $destPath"
