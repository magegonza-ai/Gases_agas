# DOCUMENTO DE REQUERIMIENTOS - SISTEMA PROMINER
## Control de Envases y Llenado de Gases

**Fecha:** 21 de agosto de 2026
**Version:** 1.0

---

## 1. OBJETIVO DEL SISTEMA

Digitalizar el proceso de recepcion, llenado y entrega de cilindros de gases industriales/medicinales, reemplazando el formulario en papel ("Control de Envases") por una aplicacion web que permita:

- Registrar la entrada de cilindros de clientes
- Identificar cada cilindro de forma individual por codigo unico
- Controlar el estado y propiedad de cada cilindro
- Generar ordenes de trabajo cuando un cilindro requiere reparacion
- Registrar el llenado y entrega al cliente
- Generar comprobantes impresos y digitales
- Controlar el stock de gases disponibles

---

## 2. ACTORES DEL SISTEMA

| Actor | Descripcion |
|-------|-------------|
| **Recepcionista** | Trabajador que recibe los cilindros del cliente, los identifica y registra en el sistema |
| **Llenador** | Trabajador que realiza el llenado de los cilindros |
| **Despachador** | Trabajador que entrega los cilindros llenos al cliente |
| **Jefe de planta** | Supervisor que puede crear y asignar ordenes de trabajo |
| **Cliente** | Empresa o persona que trae sus cilindros para llenado |

> Un mismo trabajador puede tener multiples roles dependiendo del tamano del local.

---

## 3. FLUJO DE NEGOCIO PRINCIPAL

### 3.1 Flujo General

```
Cliente llega con cilindros
         |
         v
+---------------------------+
|  RECEPCION                |
|  (Recepcionista)          |
|  - Identificar cliente    |
|  - Escanear/ingresar      |
|    codigo de cilindro     |
|  - Verificar gas          |
|  - Registrar propiedad    |
|  - Observaciones          |
+----------+----------------+
           |
      +----+----+
      |         |
      v         v
+----------+  +--------------------+
|  OK      |  |  REQUIERE          |
|          |  |  REPARACION        |
+----+-----+  +--------+-----------+
     |                 |
     |                 v
     |        +--------------------+
     |        |  ORDEN DE          |
     |        |  TRABAJO           |
     |        |  (Jefe de planta)  |
     |        +--------+-----------+
     |                 |
     |                 v
     |        +--------------------+
     |        |  REPARACION        |
     |        |  (Especialista)    |
     |        +--------+-----------+
     |                 |
     v                 v
+---------------------------+
|  LLENADO                 |
|  (Llenador)              |
|  - Seleccionar gas       |
|  - Registrar cantidad    |
|  - Actualizar estado     |
+----------+----------------+
           |
      +----+----+
      |         |
      v         v
+----------+  +---------------+
|RETIRO    |  | BODEGA        |
|INMEDIATO |  | TEMPORAL      |
+----+-----+  +-----+---------+
     |              |
     v              v
+---------------------------+
|  ENTREGA                 |
|  (Despachador)           |
|  - Generar comprobante   |
|  - Imprimir / Enviar     |
|  - Registrar entrega     |
+---------------------------+
```

### 3.2 Flujo Detallado - Recepcion

1. El **recepcionista** abre una nueva recepcion
2. Selecciona el **cliente** (o lo crea si es nuevo)
3. Ingresa el **codigo del cilindro** (escaneo o manual)
4. El sistema muestra automaticamente:
   - Gas asociado al cilindro (si ya existe en el inventario)
   - Propietario del cilindro
   - Historial previo (si lo hay)
5. El recepcionista indica:
   - **Gas con el que sera llenado** (puede ser diferente al registrado)
   - **Propietario** del cilindro (Cliente / Empresa / Tercero)
   - **Estado** del cilindro al recibirlo
   - **Observaciones** (dano visible, reparacion necesaria, etc.)
6. Si el cilindro **requiere reparacion** -> Se marca y se genera automaticamente una **Orden de Trabajo**
7. Se confirma la recepcion

### 3.3 Flujo Detallado - Orden de Trabajo

1. Se genera automaticamente desde la recepcion O manualmente por el jefe de planta
2. Contiene:
   - Referencia al cilindro
   - Tipo de trabajo requerido
   - Prioridad
   - Trabajador asignado
3. El especialista ejecuta el trabajo y registra:
   - Descripcion del trabajo realizado
   - Repuestos utilizados
   - Tiempo invertido
4. Al completar -> El cilindro vuelve al flujo de llenado

### 3.4 Flujo Detallado - Llenado

1. El **llenador** consulta los cilindros listos para llenar
2. Para cada cilindro:
   - Verifica el gas a llenar
   - Registra la cantidad (M3 / Kilos / Litros)
   - Actualiza el estado a "Lleno"
3. Los cilindros llenados pasan a:
   - **Retiro inmediato** (el cliente espera)
   - **Bodega temporal** (el cliente retira despues)

### 3.5 Flujo Detallado - Entrega

1. El **despachador** identifica los cilindros a entregar
2. Genera el **comprobante** (vale/factura)
3. El cliente firma (fisica o digitalmente)
4. Se entrega el comprobante (impreso + digital)
5. Los cilindros se marcan como "Entregados"
