# Script de verificación post-sincronización de tiempo
# Ejecuta este script después de sincronizar el tiempo del sistema

Write-Host "=== VERIFICACIÓN POST-SINCRONIZACIÓN ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "🔍 Probando escaneo manual..." -ForegroundColor Yellow
try {
    $scan = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/automation/scan" -Method POST -ContentType "application/json" -Body "{}"
    
    Write-Host "✅ Escaneo exitoso: $($scan.success)" -ForegroundColor Green
    
    if ($scan.result) {
        Write-Host ""
        Write-Host "🎯 RESULTADO:" -ForegroundColor White
        Write-Host "   • Acción: $($scan.result.action)" -ForegroundColor Gray
        Write-Host "   • Estado: $($scan.result.result)" -ForegroundColor $(if($scan.result.result -eq 'success') {'Green'} else {'Yellow'})
        
        if ($scan.result.result -eq 'success') {
            Write-Host ""
            Write-Host "🎉 ¡BOT CREADO EXITOSAMENTE!" -ForegroundColor Green
            Write-Host "   🤖 ID: $($scan.result.bot.id)" -ForegroundColor Cyan
            Write-Host "   📈 Símbolo: $($scan.result.bot.symbol)" -ForegroundColor Cyan  
            Write-Host "   💰 Inversión: `$$($scan.result.bot.investment)" -ForegroundColor Cyan
            Write-Host "   🎯 Estrategia: $($scan.result.bot.strategyType)" -ForegroundColor Cyan
            
            Write-Host ""
            Write-Host "🚀 ¡SISTEMA DE TRADING AUTOMÁTICO ACTIVADO!" -ForegroundColor Green
            Write-Host "   El motor seguirá creando bots automáticamente cada 30 segundos" -ForegroundColor Gray
            
        } elseif ($scan.result.error -and $scan.result.error -like "*Timestamp*") {
            Write-Host ""
            Write-Host "❌ Error de timestamp persistente" -ForegroundColor Red
            Write-Host "💡 Intenta sincronizar nuevamente o reinicia el sistema" -ForegroundColor Yellow
            
        } else {
            Write-Host ""
            Write-Host "📊 Estado: $($scan.result.result)" -ForegroundColor Yellow
            if ($scan.result.error) {
                Write-Host "   Error: $($scan.result.error.Split("`n")[0])" -ForegroundColor Red
            }
        }
    }
    
} catch {
    Write-Host "❌ Error conectando al servidor: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Asegúrate de que el servidor esté corriendo" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🔄 Para verificar bots activos, ejecuta:" -ForegroundColor Cyan
Write-Host 'Invoke-RestMethod -Uri "http://localhost:3001/api/v1/automation/status" -Method GET' -ForegroundColor Gray
