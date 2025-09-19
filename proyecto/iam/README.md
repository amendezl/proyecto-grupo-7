# Política mínima para despliegue Serverless

Este archivo documenta cómo Infra puede aplicar la política necesaria para permitir despliegues con Serverless Framework.

## 1. Crear la política IAM

```bash
aws iam create-policy \
  --policy-name serverless-deploy-policy \
  --policy-document file://serverless-deploy-policy.json
```

## 2. Asignar la política al usuario/rol de despliegue

```bash
aws iam attach-user-policy \
  --user-name <USUARIO_DEPLOY> \
  --policy-arn arn:aws:iam::<ID_CUENTA>:policy/serverless-deploy-policy
```

O para un rol:

```bash
aws iam attach-role-policy \
  --role-name <ROL_DEPLOY> \
  --policy-arn arn:aws:iam::<ID_CUENTA>:policy/serverless-deploy-policy
```

## 3. Notas de seguridad
- Limita el uso de este usuario/rol solo para despliegues.
- Revoca el acceso cuando no sea necesario.
- Considera usar credenciales temporales (STS) o CI/CD.

## 4. Referencia
- [Permisos de tagging en CloudFormation](https://repost.aws/knowledge-center/cloudformation-tagging-permission-error)
- [Serverless Framework IAM permissions](https://www.serverless.com/framework/docs/providers/aws/guide/credentials/)
