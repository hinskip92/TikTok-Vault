# Script: Get-TikTokVideo.ps1
# A PowerShell Script to parse TikTok's user_data.json and automate the download of
# raw video files with rate limiting and retry mechanisms.

param (
    [string]$JsonFile = "$($(Get-Location).Path)\user_data.json",
    [string]$OutputFolder = "$($(Get-Location).Path)\TikTok",
    [boolean]$Force = $false,
    [boolean]$Verbose = $false,
    [int]$MaxConcurrentDownloads = 5,
    [int]$DelayBetweenDownloads = 500,  # in milliseconds
    [int]$MaxRetries = 5,
    [string]$LogFile = "$($(Get-Location).Path)\tiktok_download.log"
)

# Function to write log messages
Function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO",
        [bool]$WriteHost = $true
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    
    if ($WriteHost) {
        switch ($Level) {
            "ERROR"   { Write-Host $logMessage -ForegroundColor Red }
            "WARNING" { Write-Host $logMessage -ForegroundColor Yellow }
            "INFO"    { Write-Host $logMessage -ForegroundColor Green }
            default   { Write-Host $logMessage }
        }
    }
    
    Add-Content -Path $LogFile -Value $logMessage
}

# Initialize log file
if (Test-Path $LogFile) {
    Write-Log "Starting new download session" -Level "INFO"
    Write-Log "----------------------------------------" -Level "INFO"
} else {
    New-Item -ItemType File -Path $LogFile -Force | Out-Null
    Write-Log "Created new log file and starting download session" -Level "INFO"
    Write-Log "----------------------------------------" -Level "INFO"
}

# Check for valid JSON file
if(-not (Test-Path $JsonFile)) {
    Write-Log "The provided user data path ($JsonFile) does not exist!" -Level "ERROR"
    exit 1
} else {
    Write-Log "Found user data JSON file at $JsonFile" -Level "INFO"
}

# Check for valid output folder, create if needed
if(-not (Test-Path $OutputFolder)) {
    try {
        New-Item -ItemType "directory" -Path $OutputFolder -Force | Out-Null
        Write-Log "Successfully created folder $OutputFolder" -Level "INFO"
    } catch {
        Write-Log "Failed to create output folder: $_" -Level "ERROR"
        exit 1
    }
}

# Read and parse JSON
try {
    $json = Get-Content $JsonFile -Raw | ConvertFrom-Json
    Write-Log "Successfully parsed & loaded user data from $JsonFile" -Level "INFO"
} catch {
    Write-Log "Failed to parse JSON file: $_" -Level "ERROR"
    Write-Log "JSON parsing error details: $($_.Exception.Message)" -Level "ERROR"
    exit 1
}

# Initialize counters
$total_photo = 0
$total_na = 0
$total_video = 0
$current_video = 0
$failed_downloads = @()

# Function to download a single TikTok video with retries
Function Get-TikTokDownload {
    param(
        [string]$Uri,
        [string]$OutFile,
        [datetime]$Date,
        [string]$File,
        [int]$MaxRetries
    )

    $attempt = 0
    $success = $false

    # Convert tiktokv.com URLs to regular tiktok.com URLs
    $Uri = $Uri -replace 'tiktokv\.com/share/video/(\d+)', 'tiktok.com/@user/video/$1'
    Write-Log "Processing download for URI: $Uri" -Level "INFO"

    while (-not $success -and $attempt -lt $MaxRetries) {
        try {
            # Use yt-dlp to download the video
            $ytdlpArgs = @(
                $Uri,
                '--output', $OutFile,
                '--no-warnings',
                '--quiet'
            )
            
            Write-Log "Attempting download with yt-dlp (Attempt ${attempt})" -Level "INFO"
            $process = Start-Process -FilePath 'yt-dlp' -ArgumentList $ytdlpArgs -Wait -NoNewWindow -PassThru
            
            if ($process.ExitCode -eq 0) {
                Write-Log "[$File] Downloaded successfully to $OutFile" -Level "INFO"
                (Get-Item $OutFile).CreationTime = $Date
                $success = $true
            } else {
                throw "yt-dlp exited with code $($process.ExitCode)"
            }
        } catch {
            $attempt++
            $errorDetails = $_.Exception.Message
            Write-Log "[$File] Attempt $attempt failed: $errorDetails" -Level "WARNING"
            
            if ($attempt -lt $MaxRetries) {
                $sleepTime = [math]::Pow(2, $attempt)
                Write-Log "[$File] Retrying in $sleepTime seconds..." -Level "INFO"
                Start-Sleep -Seconds $sleepTime
            } else {
                Write-Log "[$File] Failed after $MaxRetries attempts. Error: $errorDetails" -Level "ERROR"
                $script:failed_downloads += @{
                    File = $File
                    Uri = $Uri
                    Error = $errorDetails
                }
            }
        }
    }
}

# Process video list
try {
    $videoList = $json.Video.Videos.VideoList | Where-Object { $_.Link -ne 'N/A' -and $_.Link.Split(' ').Length -eq 1 }
    $total_video = $videoList.Count

    Write-Log "Found $total_video videos to download" -Level "INFO"
    Write-Log "Download parameters: MaxRetries=$MaxRetries, DelayBetweenDownloads=${DelayBetweenDownloads}ms" -Level "INFO"

    foreach ($video in $videoList) {
        $current_video++
        Write-Log "Processing video $current_video of $total_video" -Level "INFO"
        
        $filename = ($video.Date -replace "[: ]", "-") + ".mp4"
        $full_path = Join-Path -Path $OutputFolder -ChildPath $filename

        try {
            $date = [datetime]::ParseExact($video.Date, "yyyy-MM-dd HH:mm:ss", $null)
        } catch {
            Write-Log "[$filename] Invalid date format. Using current date. Error: $($_.Exception.Message)" -Level "WARNING"
            $date = Get-Date
        }

        if (Test-Path -LiteralPath $full_path) {
            Write-Log "[$filename] Already exists. Skipping." -Level "INFO"
            continue
        }

        Get-TikTokDownload -Uri $video.Link -OutFile $full_path -Date $date -File $filename -MaxRetries $MaxRetries
        Start-Sleep -Milliseconds $DelayBetweenDownloads
    }
} catch {
    Write-Log "Critical error during video processing: $($_.Exception.Message)" -Level "ERROR"
    Write-Log "Stack trace: $($_.ScriptStackTrace)" -Level "ERROR"
}

# Final summary
Write-Log "----------------------------------------" -Level "INFO"
Write-Log "Download session complete" -Level "INFO"
Write-Log "Total videos processed: $current_video" -Level "INFO"
Write-Log "Successfully downloaded: $($current_video - $failed_downloads.Count)" -Level "INFO"
if ($failed_downloads.Count -gt 0) {
    Write-Log "Failed downloads: $($failed_downloads.Count)" -Level "WARNING"
    Write-Log "Failed downloads summary:" -Level "WARNING"
    foreach ($failure in $failed_downloads) {
        Write-Log "  File: $($failure.File)" -Level "WARNING"
        Write-Log "  URI: $($failure.Uri)" -Level "WARNING"
        Write-Log "  Error: $($failure.Error)" -Level "WARNING"
        Write-Log "  ----------------------------------------" -Level "WARNING"
    }
}
Write-Log "Log file location: $LogFile" -Level "INFO"
Write-Log "----------------------------------------" -Level "INFO"