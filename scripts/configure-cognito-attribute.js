/**
 * Script para agregar el atributo custom:empresa_id al User Pool de Cognito
 * 
 * NOTA IMPORTANTE: Los atributos personalizados solo se pueden agregar a un User Pool
 * durante su creación o a través de la consola de AWS. Una vez creado el User Pool,
 * no se pueden agregar nuevos atributos personalizados mediante API.
 * 
 * Este script proporciona instrucciones y comandos AWS CLI para hacerlo.
 */

console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║  📋 INSTRUCCIONES: Agregar atributo custom:empresa_id al User Pool          ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

🔴 IMPORTANTE: Los atributos personalizados de Cognito solo se pueden agregar
durante la creación del User Pool. Si tu User Pool ya existe, tienes 2 opciones:

┌──────────────────────────────────────────────────────────────────────────────┐
│ OPCIÓN 1: Usar AWS Console (Recomendado para desarrollo)                    │
└──────────────────────────────────────────────────────────────────────────────┘

1. Ve a AWS Console → Cognito → User Pools
2. Selecciona tu User Pool: us-east-1_aR6LB6m5r
3. Ve a "Sign-up experience" → "Attribute configuration"
4. En "Custom attributes", agrega:
   • Name: empresa_id
   • Type: String
   • Min length: 1
   • Max length: 50
   • Mutable: Yes
5. Guarda los cambios

┌──────────────────────────────────────────────────────────────────────────────┐
│ OPCIÓN 2: Recrear User Pool con CloudFormation/Terraform (Producción)       │
└──────────────────────────────────────────────────────────────────────────────┘

Si necesitas recrear el User Pool (perderás usuarios existentes):

1. Exporta usuarios actuales (si los hay)
2. Elimina el User Pool actual
3. Crea nuevo User Pool con este atributo en la definición

Ejemplo CloudFormation:

Resources:
  UserPool:
    Type: AWS::Cognito::UserPool
    Properties:
      Schema:
        - Name: email
          Required: true
          Mutable: false
        - Name: name
          Required: true
          Mutable: true
        - Name: empresa_id  # ← Agregar aquí
          AttributeDataType: String
          Mutable: true
          StringAttributeConstraints:
            MinLength: "1"
            MaxLength: "50"

┌──────────────────────────────────────────────────────────────────────────────┐
│ ALTERNATIVA: Usar tabla DynamoDB para empresa_id (Sin cambiar Cognito)      │
└──────────────────────────────────────────────────────────────────────────────┘

Si no puedes modificar el User Pool, otra opción es almacenar la relación
usuario-empresa en DynamoDB:

Tabla: user_empresa_mapping
- PK: USER#{cognito_sub}
- SK: METADATA
- empresa_id: {uuid}
- created_at: {timestamp}

Modificar auth.js para cargar empresa_id desde DynamoDB al autenticar.

┌──────────────────────────────────────────────────────────────────────────────┐
│ ✅ SOLUCIÓN TEMPORAL (Para testing inmediato)                                │
└──────────────────────────────────────────────────────────────────────────────┘

Para testing, puedes:

1. Usar una empresa_id por defecto para todos los usuarios:
   En auth.js, línea donde se crea el objeto user:
   
   empresa_id: claims['custom:empresa_id'] || 'default-empresa-id'

2. O cargar desde una variable de entorno:
   
   empresa_id: claims['custom:empresa_id'] || process.env.DEFAULT_EMPRESA_ID

3. Luego migrar a un User Pool nuevo con el atributo cuando sea necesario

┌──────────────────────────────────────────────────────────────────────────────┐
│ 🚀 SIGUIENTE PASO                                                            │
└──────────────────────────────────────────────────────────────────────────────┘

Ejecuta después de configurar el atributo:

  node scripts/setup-multitenancy.js [empresa-id]

Esto asignará el empresa_id a todos los usuarios existentes.

╚══════════════════════════════════════════════════════════════════════════════╝
`);
