# Sistema de Certificados - Felmart

## 📋 Descripción

El sistema de certificados permite gestionar documentos PDF asociados a clientes y visitas. Los administradores y operadores pueden subir certificados y asignarlos a visitas específicas.

## 🚀 Funcionalidades

### 1. **Subir Certificados**
- Subir archivos PDF (máximo 10MB)
- Asociar certificados a clientes específicos
- Agregar observaciones y fecha de emisión
- Envío automático de correo al cliente

### 2. **Asignar Certificados desde Visitas**
- Desde el panel de visitas, ver detalles de una visita
- Botón "Gestionar Certificados" en el modal de detalles
- Dos opciones:
  - **Asignar Certificado Existente**: Seleccionar de certificados ya subidos
  - **Crear Nuevo Certificado**: Subir un nuevo PDF directamente desde la visita

### 3. **Gestión de Certificados**
- Listar todos los certificados (admin/operador)
- Filtrar por cliente y fechas
- Editar certificados existentes
- Eliminar certificados
- Descargar PDFs

## 📁 Estructura de Archivos

```
public/uploads/certificados/  # Directorio donde se almacenan los PDFs
├── certificado-{timestamp}-{random}.pdf
└── ...
```

## 🔧 Configuración

### Dependencias Requeridas
```bash
npm install multer pdfkit moment
```

### Variables de Entorno
```env
EMAIL_USER=tu-email@dominio.com
EMAIL_PASS=tu-password
```

## 📖 Uso del Sistema

### Para Administradores/Operadores

#### 1. **Crear Certificado Manualmente**
1. Ir a `/admin/certificados`
2. Hacer clic en "Nuevo Certificado"
3. Seleccionar cliente
4. Subir archivo PDF
5. Agregar observaciones (opcional)
6. Guardar

#### 2. **Asignar Certificado desde Visita**
1. Ir a `/admin/visitas`
2. Hacer clic en "Ver detalles" de una visita
3. Hacer clic en "Gestionar Certificados"
4. Elegir entre:
   - **Asignar Existente**: Seleccionar certificado de la lista
   - **Crear Nuevo**: Subir nuevo PDF

#### 3. **Gestionar Certificados Existentes**
1. Ir a `/admin/certificados`
2. Usar filtros para encontrar certificados
3. Editar o eliminar según sea necesario
4. Descargar PDFs

### Para Clientes

#### 1. **Ver Certificados**
1. Iniciar sesión como cliente
2. Ir a la sección de certificados
3. Ver lista de certificados asignados
4. Descargar PDFs disponibles

## 🔌 API Endpoints

### Obtener Certificados por Cliente
```http
GET /api/certificados/cliente/:clienteId
```

### Asignar Certificado a Visita
```http
POST /api/certificados/asignar-visita
Content-Type: application/json

{
  "visitaId": 123,
  "certificadoId": 456
}
```

### Crear Certificado desde Visita
```http
POST /api/certificados/crear-desde-visita
Content-Type: multipart/form-data

archivoPdf: [archivo PDF]
visitaId: 123
observaciones: "Observaciones del certificado"
fechaEmision: "2024-01-15"
```

## 🗄️ Base de Datos

### Tabla `certificados`
```sql
CREATE TABLE certificados (
  id INT PRIMARY KEY AUTO_INCREMENT,
  cliente_id VARCHAR(255) NOT NULL,
  visita_retiro_id INT,
  fechaEmision DATETIME DEFAULT CURRENT_TIMESTAMP,
  observaciones TEXT,
  rutaPdf VARCHAR(500) NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(rut),
  FOREIGN KEY (visita_retiro_id) REFERENCES visitas_retiro(id)
);
```

## 🔒 Seguridad

- Solo administradores y operadores pueden crear/editar certificados
- Los clientes solo pueden ver sus propios certificados
- Validación de tipos de archivo (solo PDF)
- Límite de tamaño de archivo (10MB)
- Nombres de archivo únicos para evitar conflictos

## 📧 Notificaciones

- Envío automático de correo al cliente cuando se crea un certificado
- El correo incluye información básica sobre el certificado disponible

## 🐛 Solución de Problemas

### Error: "No se pudo enviar el correo"
- Verificar configuración de email en variables de entorno
- Revisar logs del servidor para más detalles

### Error: "Archivo demasiado grande"
- El archivo debe ser menor a 10MB
- Comprimir el PDF si es necesario

### Error: "Tipo de archivo no válido"
- Solo se aceptan archivos PDF
- Verificar la extensión del archivo

### Error: "Cliente no encontrado"
- Verificar que el cliente existe en la base de datos
- Asegurar que el RUT del cliente es correcto

## 📝 Notas de Desarrollo

- Los archivos se almacenan en `public/uploads/certificados/`
- Los nombres de archivo incluyen timestamp y número aleatorio
- Se mantiene un registro de la relación entre certificados y visitas
- El sistema es compatible con múltiples formatos de fecha

## 🔄 Actualizaciones Futuras

- [ ] Generación automática de PDFs desde plantillas
- [ ] Sistema de versionado de certificados
- [ ] Notificaciones push para nuevos certificados
- [ ] Integración con firma digital
- [ ] Exportación masiva de certificados 