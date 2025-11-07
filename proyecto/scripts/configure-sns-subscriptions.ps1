# Script de Configuración de Suscripciones SNS

param(
    [Parameter(Mandatory=$false)]
    [string]$Stage = "dev",
    
    [Parameter(Mandatory=$false)]
    [string]$Email = "",
    
    [Parameter(Mandatory=$false)]
    [string]$SlackWebhookUrl = "",
    
    [Parameter(Mandatory=$false)]
    [switch]$ListOnly = $false
)

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                            ║" -ForegroundColor Cyan
Write-Host "║    SNS SUBSCRIPTION CONFIGURATOR - FASE 1                 ║" -ForegroundColor Cyan
Write-Host "║    Sistema de Alertas de Circuit Breaker                  ║" -ForegroundColor Cyan
Write-Host "║                                                            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Verificar credenciales AWS
Write-Host "🔍 Verificando credenciales AWS..." -ForegroundColor Yellow
try {
    $identity = aws sts get-caller-identity --output json | ConvertFrom-Json
    Write-Host "✓ Conectado como: $($identity.Arn)" -ForegroundColor Green
    Write-Host "  Account: $($identity.Account)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Error: No se pueden verificar credenciales AWS" -ForegroundColor Red
    Write-Host "  Ejecute: aws configure" -ForegroundColor Yellow
    exit 1
}

# Obtener ARN del SNS Topic
Write-Host "`n📡 Obteniendo ARN del SNS Topic..." -ForegroundColor Yellow
$stackName = "sistema-gestion-espacios-$Stage"

try {
    $topicArn = aws cloudformation describe-stacks `
        --stack-name $stackName `
        --query "Stacks[0].Outputs[?OutputKey=='SystemAlertsTopicArn'].OutputValue" `
        --output text
    
    if ([string]::IsNullOrWhiteSpace($topicArn)) {
        Write-Host "✗ Error: SNS Topic no encontrado en stack '$stackName'" -ForegroundColor Red
        Write-Host "  ¿Ya hizo deployment? Ejecute: npx serverless deploy --stage $Stage" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "✓ Topic ARN obtenido:" -ForegroundColor Green
    Write-Host "  $topicArn" -ForegroundColor Gray
    
} catch {
    Write-Host "✗ Error obteniendo ARN del topic: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Listar suscripciones existentes
Write-Host "`n📋 Suscripciones existentes:" -ForegroundColor Yellow
try {
    $subscriptions = aws sns list-subscriptions-by-topic `
        --topic-arn $topicArn `
        --output json | ConvertFrom-Json
    
    if ($subscriptions.Subscriptions.Count -eq 0) {
        Write-Host "  (No hay suscripciones configuradas)" -ForegroundColor Gray
    } else {
        foreach ($sub in $subscriptions.Subscriptions) {
            $status = if ($sub.SubscriptionArn -eq "PendingConfirmation") { 
                "[PENDIENTE]" 
            } else { 
                "[CONFIRMADA]" 
            }
            
            $color = if ($sub.SubscriptionArn -eq "PendingConfirmation") { 
                "Yellow" 
            } else { 
                "Green" 
            }
            
            Write-Host "  $status $($sub.Protocol): $($sub.Endpoint)" -ForegroundColor $color
        }
    }
} catch {
    Write-Host "  (Error listando suscripciones)" -ForegroundColor Red
}

# Si solo queremos listar, terminar aquí
if ($ListOnly) {
    Write-Host "`n✓ Listado completo`n" -ForegroundColor Green
    exit 0
}

# Configurar suscripción por Email
if (-not [string]::IsNullOrWhiteSpace($Email)) {
    Write-Host "`n📧 Configurando suscripción por Email..." -ForegroundColor Yellow
    Write-Host "   Email: $Email" -ForegroundColor Gray
    
    try {
        $result = aws sns subscribe `
            --topic-arn $topicArn `
            --protocol email `
            --notification-endpoint $Email `
            --output json | ConvertFrom-Json
        
        Write-Host "✓ Suscripción creada exitosamente" -ForegroundColor Green
        Write-Host "  Subscription ARN: $($result.SubscriptionArn)" -ForegroundColor Gray
        
        if ($result.SubscriptionArn -eq "pending confirmation") {
            Write-Host "`n⚠️  IMPORTANTE: Revisar bandeja de entrada de $Email" -ForegroundColor Yellow
            Write-Host "   Debe confirmar la suscripción haciendo clic en el link del email" -ForegroundColor Yellow
            Write-Host "   Asunto: 'AWS Notification - Subscription Confirmation'" -ForegroundColor Gray
        }
        
    } catch {
        Write-Host "✗ Error creando suscripción: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Configurar webhook para Slack/Teams
if (-not [string]::IsNullOrWhiteSpace($SlackWebhookUrl)) {
    Write-Host "`n🔔 Configurando webhook para notificaciones..." -ForegroundColor Yellow
    Write-Host "   Webhook URL: $($SlackWebhookUrl.Substring(0, [Math]::Min(50, $SlackWebhookUrl.Length)))..." -ForegroundColor Gray
    
    # Para Slack/Teams, necesitamos crear una Lambda que transforme el mensaje SNS
    Write-Host "⚠️  Webhook directo no soportado por SNS" -ForegroundColor Yellow
    Write-Host "   Opciones disponibles:" -ForegroundColor Yellow
    Write-Host "   1. Usar AWS Chatbot (recomendado para Slack)" -ForegroundColor White
    Write-Host "   2. Crear Lambda función que reciba SNS y llame al webhook" -ForegroundColor White
    Write-Host "   3. Usar servicio de terceros (Zapier, IFTTT)" -ForegroundColor White
    Write-Host "`n   Para AWS Chatbot, configurar manualmente en:" -ForegroundColor Yellow
    Write-Host "   https://console.aws.amazon.com/chatbot/" -ForegroundColor Gray
}

# Configurar filtros de mensajes (solo alertas HIGH)
Write-Host "`n🎯 ¿Desea configurar filtros de mensajes? (solo alertas HIGH)" -ForegroundColor Yellow
Write-Host "   Esto hace que solo reciba notificaciones de alta prioridad" -ForegroundColor Gray
$configureFilters = Read-Host "   Configurar filtros? (s/n)"

if ($configureFilters -eq "s" -or $configureFilters -eq "S") {
    Write-Host "`n   Configurando filtros..." -ForegroundColor Yellow
    
    # Obtener todas las suscripciones de email
    $emailSubscriptions = $subscriptions.Subscriptions | Where-Object { 
        $_.Protocol -eq "email" -and $_.SubscriptionArn -ne "PendingConfirmation" 
    }
    
    if ($emailSubscriptions.Count -eq 0) {
        Write-Host "   ⚠️  No hay suscripciones de email confirmadas para filtrar" -ForegroundColor Yellow
    } else {
        foreach ($sub in $emailSubscriptions) {
            Write-Host "   Aplicando filtro a: $($sub.Endpoint)" -ForegroundColor Gray
            
            # Filtro: solo alertas HIGH
            $filterPolicy = @{
                severity = @("HIGH")
            } | ConvertTo-Json -Compress
            
            try {
                aws sns set-subscription-attributes `
                    --subscription-arn $sub.SubscriptionArn `
                    --attribute-name FilterPolicy `
                    --attribute-value $filterPolicy
                
                Write-Host "   ✓ Filtro aplicado (solo severity=HIGH)" -ForegroundColor Green
            } catch {
                Write-Host "   ✗ Error aplicando filtro: $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    }
}

# Crear ejemplo de notificación de prueba
Write-Host "`n🧪 ¿Desea enviar notificación de prueba?" -ForegroundColor Yellow
$sendTest = Read-Host "   Enviar prueba? (s/n)"

if ($sendTest -eq "s" -or $sendTest -eq "S") {
    Write-Host "`n   Enviando notificación de prueba..." -ForegroundColor Yellow
    
    $testMessage = @{
        alert = "TEST_NOTIFICATION"
        severity = "HIGH"
        service = "test-service"
        message = "Esta es una notificación de prueba del sistema de alertas"
        timestamp = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
        source = "SNS Configuration Script"
    } | ConvertTo-Json -Depth 10
    
    try {
        aws sns publish `
            --topic-arn $topicArn `
            --subject "🧪 Test: Circuit Breaker Alert System" `
            --message $testMessage `
            --message-attributes '{
                "alertType": {"DataType": "String", "StringValue": "TEST"},
                "severity": {"DataType": "String", "StringValue": "HIGH"}
            }'
        
        Write-Host "   ✓ Notificación de prueba enviada" -ForegroundColor Green
        Write-Host "   Revisar bandeja de entrada en los próximos minutos" -ForegroundColor Gray
    } catch {
        Write-Host "   ✗ Error enviando notificación: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Resumen final
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                                                            ║" -ForegroundColor Green
Write-Host "║    ✅ CONFIGURACIÓN SNS COMPLETADA                        ║" -ForegroundColor Green
Write-Host "║                                                            ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Green

Write-Host "📊 Resumen de Configuración:" -ForegroundColor Cyan
Write-Host "   Topic ARN: $topicArn" -ForegroundColor Gray
Write-Host "   Stage: $Stage" -ForegroundColor Gray

# Contar suscripciones finales
$finalSubscriptions = aws sns list-subscriptions-by-topic `
    --topic-arn $topicArn `
    --output json | ConvertFrom-Json

$confirmed = ($finalSubscriptions.Subscriptions | Where-Object { $_.SubscriptionArn -ne "PendingConfirmation" }).Count
$pending = ($finalSubscriptions.Subscriptions | Where-Object { $_.SubscriptionArn -eq "PendingConfirmation" }).Count

Write-Host "   Suscripciones confirmadas: $confirmed" -ForegroundColor Green
Write-Host "   Suscripciones pendientes: $pending" -ForegroundColor Yellow
Write-Host "   Total: $($finalSubscriptions.Subscriptions.Count)" -ForegroundColor Gray

if ($pending -gt 0) {
    Write-Host "`n⚠️  RECORDATORIO: Confirmar suscripciones pendientes" -ForegroundColor Yellow
    Write-Host "   Revisar emails y hacer clic en 'Confirm subscription'" -ForegroundColor Yellow
}

Write-Host "`n📚 Próximos Pasos:" -ForegroundColor Cyan
Write-Host "   1. Confirmar suscripciones de email (si hay pendientes)" -ForegroundColor White
Write-Host "   2. Probar alertas forzando apertura de circuit breaker" -ForegroundColor White
Write-Host "   3. Configurar alarmas CloudWatch adicionales" -ForegroundColor White
Write-Host "   4. Integrar con sistema de tickets (opcional)" -ForegroundColor White

Write-Host "`n✓ Script completado exitosamente`n" -ForegroundColor Green

# Guardar información en archivo
$configFile = "sns-config-$Stage.json"
$config = @{
    topicArn = $topicArn
    stage = $Stage
    configuredAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    subscriptions = $finalSubscriptions.Subscriptions
} | ConvertTo-Json -Depth 10

$config | Out-File -FilePath $configFile -Encoding UTF8
Write-Host "💾 Configuración guardada en: $configFile`n" -ForegroundColor Gray
