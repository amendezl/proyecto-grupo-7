# Instrucciones para Crear ZIP de Entrega

## Opción 1: Usando Git Archive (Recomendado)

Este método crea un ZIP limpio sin archivos de Git:

```powershell
cd c:\Users\benjo\GitHub\proyecto-grupo-7
git archive --format=zip --output=../Sistema-Gestion-Espacios-Grupo7.zip entregable
```

## Opción 2: Usando PowerShell

Si prefieres crear el ZIP manualmente:

```powershell
cd c:\Users\benjo\GitHub\proyecto-grupo-7
Compress-Archive -Path * -DestinationPath ..\Sistema-Gestion-Espacios-Grupo7.zip -Force `
  -CompressionLevel Optimal `
  -Exclude @(
    ".git",
    "node_modules",
    ".next",
    "out",
    ".serverless",
    ".terraform",
    "*.log"
  )
```

## Opción 3: Clonar y ZIP

```powershell
# Clonar solo la branch entregable
cd c:\Users\benjo
git clone --branch entregable --single-branch https://github.com/amendezl/proyecto-grupo-7.git proyecto-entrega
cd proyecto-entrega

# Eliminar carpeta .git
Remove-Item -Recurse -Force .git

# Crear ZIP
cd ..
Compress-Archive -Path proyecto-entrega\* -DestinationPath Sistema-Gestion-Espacios-Grupo7.zip
```

## Verificar Contenido del ZIP

El ZIP debe contener:
- ✅ `frontend/` (código fuente, package.json, tsconfig.json)
- ✅ `proyecto/` (código fuente, serverless.yml, package.json)
- ✅ `infrastructure/` (CloudFormation templates)
- ✅ `devops/` (scripts de deployment)
- ✅ `chaos-engineering/` (módulo de caos)
- ✅ `docs/` (documentación)
- ✅ `README.md`
- ✅ `ENTREGA.md`
- ✅ `PLAN_DE_PRUEBAS.md`
- ✅ `LICENSE`

## NO debe contener:
- ❌ `node_modules/`
- ❌ `.next/`
- ❌ `out/`
- ❌ `.serverless/`
- ❌ `.terraform/`
- ❌ `*.tfstate`
- ❌ `*.tfplan`
- ❌ Archivos temporales (*.log, *.tmp)
- ❌ Scripts de limpieza
- ❌ Carpeta `.git/`

## Tamaño Esperado

El ZIP final debería tener aproximadamente:
- **Sin node_modules**: ~5-10 MB
- Estructura de carpetas clara
- Solo código fuente y documentación

## Entrega al Evaluador

Una vez creado el ZIP, verificar:
1. Que se puede extraer correctamente
2. Que ENTREGA.md está en la raíz
3. Que README.md tiene toda la información
4. Que no hay archivos sensibles (.env, credenciales)
