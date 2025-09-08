# Fix curl alias issue in PowerShell
# This script creates a proper curl function and adds it to PowerShell profile

$curlFunction = @'
function curl {
    param(
        [Parameter(Position=0, Mandatory=$true)]
        [string]$Url,
        
        [Parameter()]
        [switch]$Silent,
        
        [Parameter()]
        [string]$Method = "GET",
        
        [Parameter()]
        [string]$Data,
        
        [Parameter()]
        [string[]]$Header,
        
        [Parameter()]
        [switch]$IncludeHeaders
    )
    
    # Check if curl.exe exists (native curl)
    $curlExe = Get-Command "curl.exe" -ErrorAction SilentlyContinue
    
    if ($curlExe) {
        # Use native curl.exe if available
        $args = @()
        
        if ($Silent) { $args += "-s" }
        if ($Data) { 
            $args += "-d", $Data
            $args += "-X", $Method
        }
        if ($Header) {
            foreach ($h in $Header) {
                $args += "-H", $h
            }
        }
        if ($IncludeHeaders) { $args += "-i" }
        
        $args += $Url
        
        & curl.exe @args
    } else {
        # Fallback to Invoke-RestMethod
        $params = @{
            Uri = $Url
            Method = $Method
        }
        
        if ($Data) {
            $params.Body = $Data
            $params.ContentType = "application/json"
        }
        
        if ($Header) {
            $headers = @{}
            foreach ($h in $Header) {
                $parts = $h -split ":", 2
                if ($parts.Count -eq 2) {
                    $headers[$parts[0].Trim()] = $parts[1].Trim()
                }
            }
            $params.Headers = $headers
        }
        
        try {
            $response = Invoke-RestMethod @params
            if ($response -is [string]) {
                Write-Output $response
            } else {
                $response | ConvertTo-Json -Depth 10
            }
        } catch {
            Write-Error "curl: $($_.Exception.Message)"
        }
    }
}
'@

# Add to PowerShell profile
$profilePath = $PROFILE
$profileDir = Split-Path $profilePath -Parent

if (!(Test-Path $profileDir)) {
    New-Item -ItemType Directory -Path $profileDir -Force
}

if (!(Test-Path $profilePath)) {
    New-Item -ItemType File -Path $profilePath -Force
}

# Check if curl function already exists in profile
$profileContent = Get-Content $profilePath -ErrorAction SilentlyContinue
if ($profileContent -notcontains "function curl {") {
    Add-Content -Path $profilePath -Value "`n# Fixed curl function for PowerShell"
    Add-Content -Path $profilePath -Value $curlFunction
    Write-Host "Added curl function to PowerShell profile: $profilePath" -ForegroundColor Green
    Write-Host "Restart PowerShell or run: . `$PROFILE" -ForegroundColor Yellow
} else {
    Write-Host "curl function already exists in profile" -ForegroundColor Blue
}

# Load the function in current session
Invoke-Expression $curlFunction
Write-Host "curl function loaded in current session" -ForegroundColor Green
