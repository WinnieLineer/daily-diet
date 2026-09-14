$content = Get-Content -Raw 'gas\06_FlexMessages.js' -Encoding UTF8
$patch = Get-Content -Raw 'C:\Users\linw2\.gemini\antigravity-ide\brain\a5fa79d8-0d9c-45d6-b63b-d04e0625d9da\scratch\manage_meals_patch.js' -Encoding UTF8

# Find section markers
$sectionCommentOld = "// ========================================================`r`n// " + [char]0x1F4CB + " 5."
$sectionCommentNew = "// ========================================================`r`n// " + [char]0x2B50 + " 6."

$startIdx = $content.IndexOf("// ========================================================`r`n// `u{1F4CB} 5.")
$endIdx = $content.IndexOf("// ========================================================`r`n// `u{2B50} 6.")

Write-Host "startIdx=$startIdx endIdx=$endIdx"

if ($startIdx -ge 0 -and $endIdx -gt $startIdx) {
    $before = $content.Substring(0, $startIdx)
    $after = $content.Substring($endIdx)
    $newContent = $before + $patch + "`r`n" + $after
    [System.IO.File]::WriteAllText((Resolve-Path 'gas\06_FlexMessages.js').Path, $newContent, [System.Text.Encoding]::UTF8)
    Write-Host "Patched successfully. New length: $($newContent.Length)"
} else {
    Write-Host "Markers not found. Trying line-based approach..."
    # fall back to line-based
    $lines = $content -split "`r`n"
    Write-Host "Total lines: $($lines.Count)"
    # Find function line
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -like "*generateManageMealsFlex*") { Write-Host "Found at line $i: $($lines[$i])" }
    }
}
