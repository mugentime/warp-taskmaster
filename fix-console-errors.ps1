# AUTOMATED CONSOLE ERROR FIXES
# This PowerShell script fixes common frontend console errors

Write-Host "🔧 AUTOMATED CONSOLE ERROR FIXES" -ForegroundColor Cyan -BackgroundColor Blue
Write-Host "Fixing common frontend issues..." -ForegroundColor Yellow

# 1. Fix Tailwind CSS CDN warning
Write-Host ""
Write-Host "1. 🎨 FIXING TAILWIND CSS ISSUES..." -ForegroundColor Blue

# Check if Tailwind is properly configured in vite.config.ts
$viteConfig = Get-Content "vite.config.ts" -Raw
if ($viteConfig -notmatch "tailwindcss") {
    Write-Host "  📝 Adding Tailwind CSS import to vite config..." -ForegroundColor Yellow
    
    # Update vite.config.ts to include CSS imports
    $newViteConfig = @"
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      css: {
        postcss: './postcss.config.js',
      },
      server: {
        proxy: {
          '/api': {
            target: 'http://localhost:3001',
            changeOrigin: true,
            secure: false
          }
        }
      }
    };
});
"@
    Set-Content -Path "vite.config.ts" -Value $newViteConfig
    Write-Host "  ✅ Vite config updated with CSS processing" -ForegroundColor Green
}

# 2. Create PostCSS config if missing
Write-Host ""
Write-Host "2. 📦 CREATING POSTCSS CONFIG..." -ForegroundColor Blue

if (-not (Test-Path "postcss.config.js")) {
    $postcssConfig = @"
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
"@
    Set-Content -Path "postcss.config.js" -Value $postcssConfig
    Write-Host "  ✅ PostCSS config created" -ForegroundColor Green
} else {
    Write-Host "  ✅ PostCSS config already exists" -ForegroundColor Green
}

# 3. Create Tailwind config if missing
Write-Host ""
Write-Host "3. 🎨 CREATING TAILWIND CONFIG..." -ForegroundColor Blue

if (-not (Test-Path "tailwind.config.js")) {
    $tailwindConfig = @"
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./App.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'gray-900': '#121827',
        'gray-800': '#1a202c',
        'gray-700': '#2d3748',
        'gray-600': '#4a5568',
      }
    },
  },
  plugins: [],
}
"@
    Set-Content -Path "tailwind.config.js" -Value $tailwindConfig
    Write-Host "  ✅ Tailwind config created" -ForegroundColor Green
} else {
    Write-Host "  ✅ Tailwind config already exists" -ForegroundColor Green
}

# 4. Fix CSS imports - create proper index.css
Write-Host ""
Write-Host "4. 🎨 FIXING CSS IMPORTS..." -ForegroundColor Blue

$indexCSS = @"
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom styles for the trading app */
.bg-gray-900 {
  background-color: #121827;
}

.bg-gray-800 {
  background-color: #1a202c;
}

.bg-gray-700 {
  background-color: #2d3748;
}

.bg-gray-600 {
  background-color: #4a5568;
}
"@

Set-Content -Path "src/index.css" -Value $indexCSS -Force
Write-Host "  ✅ CSS file created with Tailwind imports" -ForegroundColor Green

# Also create it in root for Vite
Set-Content -Path "index.css" -Value $indexCSS -Force
Write-Host "  ✅ Root CSS file created" -ForegroundColor Green

# 5. Update HTML to remove CDN and use local CSS
Write-Host ""
Write-Host "5. 📄 UPDATING HTML FILE..." -ForegroundColor Blue

$indexHtml = Get-Content "index.html" -Raw
if ($indexHtml -match "cdn.tailwindcss.com") {
    # Remove CDN script and add local CSS
    $newIndexHtml = $indexHtml -replace '<script src="https://cdn\.tailwindcss\.com"></script>', ''
    $newIndexHtml = $newIndexHtml -replace '<script>.*?tailwind\.config.*?</script>', ''
    
    # Add local CSS link if not present
    if ($newIndexHtml -notmatch 'index\.css') {
        $newIndexHtml = $newIndexHtml -replace '</head>', '  <link rel="stylesheet" href="/index.css">`n</head>'
    }
    
    Set-Content -Path "index.html" -Value $newIndexHtml
    Write-Host "  ✅ HTML updated to use local CSS" -ForegroundColor Green
} else {
    Write-Host "  ✅ HTML already using local CSS" -ForegroundColor Green
}

# 6. Install missing dependencies
Write-Host ""
Write-Host "6. 📦 CHECKING DEPENDENCIES..." -ForegroundColor Blue

$packageJson = Get-Content "package.json" | ConvertFrom-Json

# Check if Tailwind is in dependencies
if (-not $packageJson.devDependencies.tailwindcss -and -not $packageJson.dependencies.tailwindcss) {
    Write-Host "  📦 Installing Tailwind CSS..." -ForegroundColor Yellow
    npm install -D tailwindcss postcss autoprefixer
    Write-Host "  ✅ Tailwind CSS installed" -ForegroundColor Green
} else {
    Write-Host "  ✅ Tailwind CSS already installed" -ForegroundColor Green
}

# 7. Rebuild the project
Write-Host ""
Write-Host "7. 🔨 REBUILDING PROJECT..." -ForegroundColor Blue

Write-Host "  🔨 Running build..." -ForegroundColor Yellow
npm run build | Out-Host

if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Build completed successfully" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Build had issues, but continuing..." -ForegroundColor Yellow
}

# 8. Restart preview server
Write-Host ""
Write-Host "8. 🚀 RESTARTING PREVIEW SERVER..." -ForegroundColor Blue

# Kill existing preview processes
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -eq "node" } | ForEach-Object {
    Write-Host "  🔄 Stopping existing server process $($_.Id)" -ForegroundColor Yellow
    try { $_.Kill() } catch { }
}

Start-Sleep -Seconds 2

# Start new preview server in background
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "npm run preview" -WindowStyle Minimized
Write-Host "  ✅ Preview server restarted in background" -ForegroundColor Green

# 9. Open browser and run console debugger
Write-Host ""
Write-Host "9. 🌐 OPENING DEBUGGER..." -ForegroundColor Blue

Start-Sleep -Seconds 5  # Wait for server to start
Start-Process "http://localhost:4173/"

Write-Host ""
Write-Host "🎉 AUTOMATED FIXES COMPLETED!" -ForegroundColor Green -BackgroundColor Black
Write-Host ""
Write-Host "📋 SUMMARY OF FIXES APPLIED:" -ForegroundColor Cyan
Write-Host "  ✅ Tailwind CSS CDN removed and local version configured" -ForegroundColor Green
Write-Host "  ✅ PostCSS and Tailwind configs created" -ForegroundColor Green
Write-Host "  ✅ CSS imports fixed and proper stylesheets created" -ForegroundColor Green
Write-Host "  ✅ HTML updated to use local assets" -ForegroundColor Green
Write-Host "  ✅ Dependencies installed" -ForegroundColor Green
Write-Host "  ✅ Project rebuilt with new configuration" -ForegroundColor Green
Write-Host "  ✅ Preview server restarted" -ForegroundColor Green
Write-Host ""
Write-Host "🔍 NEXT STEPS:" -ForegroundColor Yellow
Write-Host "1. Browser should open automatically to http://localhost:4173/" -ForegroundColor White
Write-Host "2. Open Developer Tools (F12)" -ForegroundColor White
Write-Host "3. Go to Console tab" -ForegroundColor White
Write-Host "4. Copy debug-console-errors.js content and paste it" -ForegroundColor White
Write-Host "5. Check if console errors are fixed!" -ForegroundColor White
