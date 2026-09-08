# Inventario de textos visibles — MyWorldXP

Inventario completo de strings hardcodeados visibles para el usuario, para preparar la app para soporte de español/inglés (i18n). **No se tradujo ni modificó nada** — este documento es solo el relevamiento.

Formato de cada entrada: `"texto exacto"` — `archivo:línea` — nota de contexto.

---

## 1. Onboarding (`app/onboarding.tsx`)

Pantalla de bienvenida (splash/onboarding inicial).

- `"My "` / `"World"` / `"XP"` — L65-67 — logo/título compuesto ("MyWorldXP")
- `"TU MUNDO · TU HISTORIA · TUS LOGROS"` — L71 — subtítulo bajo el logo
- `"Registrá tus viajes"` — L79 — feature title 1
- `"Cada ciudad, cada país"` — L80 — feature desc 1
- `"Ganá XP"` — L87 — feature title 2
- `"Subí de nivel viajando"` — L88 — feature desc 2
- `"Tu pasaporte"` — L95 — feature title 3
- `"Historial de viajes y stats"` — L96 — feature desc 3
- `"CREAR MI PASAPORTE →"` — L108 — botón principal (CTA)
- `"RESTAURAR BACKUP"` — L118 — link, solo visible si hay backup detectado
- Alert **"Restaurar backup"** (título) — L26 — confirmación de restauración
  - mensaje dinámico vía `buildRestoreConfirmMessage()` (ver sección Backup/utils)
  - botón `"Cancelar"` (style cancel) — L29
  - botón dinámico `"Cargar Backup"` (si ya hay datos actuales) / `"Restaurar"` (si no hay datos) — L31
- Alert **"Error"** / `"El archivo de backup está dañado o no se puede leer."` — L38 — error al aplicar backup

---

## 2. Crear Perfil (`app/(tabs)/profile.tsx`)

Pantalla de creación de perfil de usuario (primer paso tras onboarding).

- `"CREÁ TU PERFIL"` — L133 — título de pantalla
- `"Contanos quién sos para empezar tu viaje"` — L137 — subtítulo
- `"Tocá para agregar tu foto"` — L163 — hint bajo el avatar
- Placeholder `"Nombre"` — L174
- Placeholder `"Apellido"` — L190
- Placeholder `"Nacionalidad"` — L206
- Placeholder `"Ciudad donde resides"` — L223
- Placeholder `"País donde resides"` — L246
- `"Ciudad no encontrada"` — L58, L229, L252 — error de validación de ciudad (también fallback si falta ciudad)
- `"País no encontrado"` — L59, L253, L282 — error de validación de país
- `"CONTINUAR →"` — L297 — botón final
- Alert **"Seleccionar imagen"** / `"Elegí una opción"` — L105 — selector de foto
  - botón `"Tomar foto"` — L106
  - botón `"Elegir de galería"` — L107
  - botón `"Cancelar"` (style cancel) — L108
- Alert **"Error"** / `"No se pudo guardar la foto. Intentá de nuevo."` — L70 — error al guardar foto
- Alert **"Faltan datos"** — L276 — validación de formulario incompleto
  - mensaje dinámico: `"Para continuar debés completar:\n\n• {campo}\n..."` — L277
  - nombres de campos faltantes usados en el mensaje: `"Foto de perfil"` (L267), `"Nombre"` (L268), `"Apellido"` (L269), `"Nacionalidad"` (L270), `"Ciudad de residencia"` (L271), `"País de residencia"` (L272)

---

## 3. Detalle de viaje (`app/detalle.tsx`)

Pantalla de detalle/edición de un viaje ya cargado.

### Header / navegación
- `"‹"` + `"Volver"` — L547-548 — botón volver (también en loading state L522-523)
- `"Cargando..."` — L527 — texto de carga

### Galería de fotos
- `"◆  PORTADA"` — L602 — badge foto de portada
- `"Tocar para hacer portada"` — L606 — hint sobre foto no-portada
- `"+ Agregar"` — L624 — botón agregar fotos (modo edición)
- `"Cancelar"` — L632 — botón cancelar edición de fotos
- `"Guardando..."` / `"Listo"` — L642 — botón guardar fotos (dinámico según `saving`)
- `"{n} fotos"` — L649 — contador de fotos
- `"Editar fotos"` — L657 — botón entrar en modo edición de fotos
- `"✈"` (ícono) + `"Sin fotos"` — L668-669 — estado vacío
- `"+ Agregar fotos"` — L671 — botón agregar (estado sin fotos)

### Ubicación
- `"UBICACIÓN"` — L685 — label de card
- `"Editar"` — L689 (y reutilizado en Fecha L784, Comentario L851 "Editar"/"+ Agregar", Tips L901) — link editar
- Placeholder `"Ciudad"` — L699
- Placeholder `"País"` — L707
- `"✓ Ubicación confirmada"` — L730
- `"No se encontró. Revisá los datos."` — L731
- `"Error de conexión. Intentá de nuevo."` — L732
- `"Cancelar"` — L740 (reutilizado en Fecha L827, Comentario L873)
- `"Guardando..."` / `"Guardar"` — L749 — botón guardar ubicación
- `"Buscando..."` / `"Buscar"` — L758 — botón buscar ubicación

### Fecha del viaje
- `"FECHA DEL VIAJE"` — L781
- Placeholders `"DD"` / `"MM"` / `"AAAA"` — L796, L805, L814
- `"Guardando..."` / `"Guardar"` — L835 — botón guardar fecha
- Alert **"Fecha inválida"** / `"Ingresá una fecha completa (DD, MM y año de 4 dígitos)."` — L228-229
- Alert **"Viaje de varios destinos"** — L237 — cambio de año en viaje multidestino
  - mensaje: `"Este viaje forma parte de un viaje de varios destinos. Estás cambiando el año.\n\n¿Qué querés hacer?"` — L238
  - botón `"Cancelar"` — L240
  - botón `"Solo este destino"` — L241
  - botón `"Cambiar todos"` — L242

### Comentario / Nota
- `"COMENTARIO"` — L848
- `"+ Agregar"` / `"Editar"` (dinámico) — L851
- Placeholder `"Escribí algo sobre este viaje..."` — L863
- `"Guardando..."` / `"Guardar"` — L881
- `"Sin comentario"` — L888 — estado vacío

### Tips de viaje
- `"TIPS DE VIAJE"` — L898
- `"+ Agregar"` / `"Editar"` (dinámico) — L901
- Placeholder / texto vacío: `"Cargar datos útiles de este destino, bares, restaurantes, lugares imperdibles..."` — L922, L955 (mismo texto usado como placeholder y como estado vacío clickeable)
- `"Guardando..."` / `"Guardar"` — L944
- `"↑ Compartir tips"` — L961 — botón compartir
- Alert **"¡Copiado!"** / `"Texto copiado. Ahora podés pegarlo donde quieras."` — L208 — confirmación de copiado
- Texto compartido generado (clipboard, no UI directa pero visible al pegar): `"{nombre} de MyWorldXP te recomienda que si visitás {ciudad}, {pais} tengas en cuenta:\n\n{tips}"` — L206

### Eliminar viaje
- `"Eliminar viaje"` — L975 — botón
- Alert **"¿Eliminar viaje?"** / `"¿Estás seguro de que querés eliminar el viaje a {ciudad}?"` — L481-482
  - botón `"Cancelar"` — L484
  - botón `"Eliminar"` (destructive) — L485

### Errores generales
- Alert **"Error"** / `"No se pudo cargar el viaje."` — L159
- Alert **"Error"** / `"No se pudo guardar."` — L178, L272, L295 (repetido en varios handlers)
- Alert **"Máximo 4 fotos"** / `"Ya cargaste el máximo de fotos permitidas."` — L408-409
- Alert **"Agregar fotos"** (título, sin mensaje) — L411
  - botón `"Elegir de galería"` — L412
  - botón `"Tomar foto"` — L413
  - botón `"Cancelar"` — L414
- Alert **"Permiso necesario"** / `"Necesitamos acceso a tu galería."` — L423-424
- Alert **"Permiso necesario"** / `"Necesitamos acceso a tu cámara."` — L440-441
- Alert **"Error"** / `"No se pudieron guardar las fotos."` — L470
- Alert **"Error"** / `"No se pudieron guardar los cambios."` — L389
- Alert **"Error"** / `"No se pudo eliminar el viaje."` — L510

---

## 4. Pantallas de plantilla / no utilizadas activamente

Estas pantallas son boilerplate por defecto de Expo Router y no forman parte del flujo real de la app (no se llega a ellas desde ninguna navegación observada), pero técnicamente tienen texto hardcodeado en inglés. Se incluyen por completitud:

- `app/(tabs)/explore.tsx` — pantalla de ejemplo "Explore" con textos en inglés: `"Explore"`, `"This app includes example code to help you get started."`, `"File-based routing"`, `"Android, iOS, and web support"`, `"Images"`, `"Light and dark mode components"`, `"Animations"`, `"Learn more"` (x3), etc. (L30-96)
- `app/modal.tsx` — `"This is a modal"` (L10), `"Go to home screen"` (L12)

---

## 5. Cargar Viaje (`app/cargar.tsx`)

Pantalla más grande de la app: registrar un viaje nuevo (hecho o "por hacer"), modo ciudad única o multidestino.

> Nota: `CIUDADES` (L218-433) es un listado grande hardcodeado de pares ciudad/país usado para autocompletar sugerencias — no es copy traducible, se omite del detalle individual (son nombres propios).

### Header y toggles principales
- `"Cargar Viaje"` — L1671 — título de pantalla
- `"Registrá tu experiencia o tu próximo destino"` — L1672 — subtítulo
- `"Ya lo hice"` — L1682 — toggle: viaje real
- `"Lo quiero hacer"` — L1701 — toggle: wishlist
- `"Visité una ciudad"` — L1714 — toggle: modo ciudad única
- `"Visité más de una ciudad"` — L1733 — toggle: modo multidestino

### Selector de fecha (dropdowns día/mes/año) — reutilizado en varios bloques
- Meses: `"ENE"`, `"FEB"`, `"MAR"`, `"ABR"`, `"MAY"`, `"JUN"`, `"JUL"`, `"AGO"`, `"SEP"`, `"OCT"`, `"NOV"`, `"DIC"` — L167-172
- `"✓"` — L502 — check de item seleccionado en dropdown
- Placeholders `"DD"` / `"Mes"` / `"AAAA"` — L998/1006/1014 (bloque multi) y L1914/1922/1930 (bloque único)
- `"▴"` / `"▾"` — chevrones abrir/cerrar (decorativo)

### Modal selector de fotos del viaje (`FotoPickerModal`)
- `"Cancelar"` — L551
- `"Fotos del viaje"` — L553 — título del modal
- `"Listo ({n})"` — L556 — botón confirmar selección
- `"Todas las fotos preseleccionadas ya están asignadas a otros destinos de este viaje."` — L565 — estado vacío
- `"Todavía no preseleccionaste fotos para este viaje.\nUsá \"Seleccionar fotos del viaje\" para agregar."` — L566 — estado vacío (cita el label de otro botón)
- `"Seleccioná hasta {n} foto(s) para este destino"` — L572 — hint (pluralizado foto/fotos)
- `"✓"` — L596 — check en miniatura seleccionada

### Bloque "Destino" (ciudad/país) — se repite en modo único y multidestino
- `"Destino {N romano}"` — L816 — título de bloque (multidestino: Destino I, II, III…)
- `"Destino"` — L820, L1743 — label de sección
- Placeholder `"Ciudad"` — L824, L1747
- Placeholder `"País"` — L846, L1769
- Botón validar (dinámico según estado de geocoding):
  - `"Validando..."` — L868, L1791
  - `"OK"` — L869, L1792
  - `"No encontrada — intentá de nuevo"` — L870, L1793
  - `"Error al validar — intentá de nuevo"` — L871, L1794
  - `"Varias coincidencias — elegí una"` — L872, L1795
  - `"VALIDAR"` — L873, L1796 (estado por defecto)
- `"Error al conectar. Verificá tu conexión e intentá de nuevo."` — L879, L1802
- `"No encontramos la ciudad ingresada."` — L885, L1808
- `"Elegir otra ciudad"` — L888, L1811
- `"Confirmar solo con el país"` — L896, L1819

### Fotos del destino
- `"Fotos ({n}/4)"` — L931, L1852 — label con contador
- `"✦"` — ícono decorativo (agregar fotos)
- `"Agregar fotos"` — L935 / `"Cargar fotos"` — L1856 (labels distintos según modo)
- `"Del viaje"` — L936 — hint (fotos vienen del pool preseleccionado)
- `"Galería · Cámara"` — L936, L1857 — hint alternativo
- Alert **"¿Portada?"** / `"¿Deseás asignar esta foto como portada?"` — L949-950, L1870-1871
  - botón `"Cancelar"` — L952, L1873
  - botón `"Asignar"` — L953, L1874
- `"Portada"` — L962, L1883 — badge en miniatura
- `"✕"` — botón quitar foto
- `"La primera foto será la portada del viaje."` — L983, L1899 — hint sin fotos aún

### Nota del destino
- `"Nota"` — L1044, L1960 — label
- `"(opcional)"` — L1044, L1960
- `"Contá algo de este destino..."` — L1047 (multidestino) / `"Contá algo de este viaje..."` — L1963 (único) — placeholders levemente distintos
- `"{n}/1000"` — contador de caracteres

### Preselección de fotos (solo modo multidestino)
- `"Preseleccionar fotos de todo el viaje"` — L1996 — título de bloque
- `"Seleccioná todas las fotos que podrían formar parte de este viaje. Más adelante podrás asignarlas a cada ciudad."` — L1998
- `"{n} foto(s) · Cambiar selección"` — L2002-2003 — botón si ya hay fotos preseleccionadas
- `"Seleccionar fotos"` — L2004 — botón si no hay fotos aún
- `"+{n}"` — L2014 — badge "+N más" cuando hay más de 10 fotos

### Botones finales
- `"Guardar viaje"` / `"Guardar destino"` — L1984 — dinámico según tipo (modo único)
- `"+ Agregar ciudad"` — L2039 — agregar otro destino (modo multidestino)
- `"Finalizar viaje"` — L2042 — enviar formulario (modo multidestino)

### Alertas de validación (modo multidestino)
- **"Falta información"** / `"Destino {N}: la ciudad es obligatoria."` — L1234
- **"Falta información"** / `"Destino {N}: el país es obligatorio."` — L1238
- **"Destino sin validar"** / `"Destino {N}: presioná \"VALIDAR\" antes de guardar."` — L1242
- **"Falta información"** / `"Destino {N}: la fecha es obligatoria."` — L1246
- **"Fecha inválida"** / `"Destino {N}: la fecha ingresada no existe. Revisala e intentá de nuevo."` — L1250
- **"Fecha inválida"** / `"Destino {N}: un viaje realizado no puede tener una fecha posterior a hoy."` — L1254
- **"Viaje multidestino"** / `"Hay más de 30 días entre algunos destinos de este viaje multidestino. ¿Querés revisar las fechas o guardar igualmente?"` — L1261-1262
  - botón `"Revisar"` — L1264
  - botón `"Guardar igualmente"` — L1265
- **"¡Guardado!"** / `"Tu viaje con {n} ciudades fue guardado correctamente."` — L1319
- **"Error"** / `"No se pudo guardar. Intentá de nuevo."` — L1323

### Alertas de validación (modo único)
- **"Faltan datos"** / `"Ingresá ciudad y país antes de validar el destino."` — L1411
- **"País no encontrado"** / `"No pudimos validar el país ingresado. Revisalo e intentá de nuevo."` — L1452
- **"Máximo 4 fotos"** / `"Ya cargaste el máximo de fotos permitidas."` — L1462
- Alert **"Cargar fotos"** (sin mensaje) — L1465
  - botón `"Elegir de galería"` — L1466
  - botón `"Tomar foto"` — L1467
  - botón `"Cancelar"` — L1468
- **"Permiso necesario"** / `"Necesitamos acceso a tu galería."` — L1476
- **"Permiso necesario"** / `"Necesitamos acceso a tu cámara."` — L1495
- **"Falta información"** / `"La ciudad es obligatoria."` — L1512
- **"Falta información"** / `"El país es obligatorio."` — L1516
- **"Destino sin validar"** / `"Presioná \"VALIDAR\" antes de guardar."` — L1520
- **"Falta información"** / `"La fecha de inicio es obligatoria para viajes reales."` — L1525
- **"Fecha inválida"** / `"La fecha ingresada no existe. Revisala e intentá de nuevo."` — L1529
- **"Fecha inválida"** / `"Un viaje realizado no puede tener una fecha posterior a hoy."` — L1533
- **"¡Guardado!"** / `"Tu {viaje|destino} fue guardado correctamente."` — L1630 (palabra dinámica según tipo)
- **"Error"** / `"No se pudo guardar. Intentá de nuevo."` — L1634

---

## 6. Mapa (`app/mapa.tsx`)

- Alert **"Confirmar posición"** / `"¿Guardar esta nueva posición del pin?"` — L132-133 — al arrastrar un pin
  - botón `"Cancelar"` — L136
  - botón `"Guardar"` — L141
- `"↺  Restablecer posición original del pin"` — L221 — botón, visible solo si el pin fue movido manualmente
- `"✕"` — L230 — cerrar tarjeta overlay
- `"◆ {fecha}"` — L282 — fecha de inicio (viaje real)
- `"PENDIENTE"` — L285 — badge de wishlist
- `"¡Lo logré!"` — L291 — acción para marcar wishlist como cumplido
- `"✔"` / `"→"` — L292-293 — íconos de esa acción

---

## 7. Medallero / Logros (`app/medallero.tsx`)

- `"← Volver"` — L56 — botón volver
- `"Medallero"` — L60 — título de pantalla
- `"{n} de {total} logros desbloqueados"` — L62 — subtítulo dinámico
- Categorías (headers de sección, en mayúsculas): `"Progreso"`, `"Continentes"`, `"Comportamiento"`, `"Planificación"`, `"Cumplimiento"`, `"Experiencia"`, `"Actividad"`, `"Especiales"` — L20-29
- `"★"` / `"◆"` — L87 — íconos logro desbloqueado/bloqueado
- `"???"` — L93 — nombre oculto de logro bloqueado
- `"Bloqueado"` — L100 — label de estado bloqueado
- (Los nombres/descripciones reales de cada logro vienen de `utils/achievementsEngine.ts`, ver sección 10)

---

## 8. Estadísticas (`app/estadisticas.tsx`)

- `"Estadísticas"` — L306 — título
- `"Tu resumen de viajero"` — L307 — subtítulo
- `"Cargando..."` — L312

### Rango / XP
- `"RANGO ACTUAL"` — L62
- `" XP"` — L70 — sufijo junto al total
- `"→"` — L83 — separador hacia próximo rango
- `"MÁXIMO ★"` — L87 — cuando ya alcanzó el rango máximo
- `"Faltan {n} XP para {rango}"` — L92

### Continentes
- `"CONTINENTES"` — L115
- `"{n} / {total}"` — L117 — contador
- `"{pct}% del mundo explorado"` — L124
- `"—"` — L150 — sin datos (continente no visitado)
- `"{pct}%"` — L150 — visitado
- `"viaje"` / `"viajes"` — L157 — singular/plural
- `"Sin visitar"` — L158

### Top países / ciudades
- `"TOP PAÍSES MÁS VISITADOS"` — L174, L184 (incluye variante estado vacío)
- `"—"` — L175, L221 — estado vacío
- `"#"` — prefijo de ranking — L190, L232
- `"vez"` / `"veces"` — L195 — singular/plural
- `"TOP CIUDADES MÁS VISITADAS"` — L220, L228
- `"viaje"` / `"viajes"` — L235 — singular/plural

---

## 9. Passport — Portada (`app/passportcover.tsx`)

- `"MYWORLDXP"` — L112, L115 — texto circular del sello (decorativo, nombre de marca)
- `"CONFIG"` — L136 — label dentro del ícono de ajustes
- `"MY "` / `"WORLD"` / `"XP"` — L229-231 — marca compuesta
- `"PASSPORT"` — L244 — título principal de la tapa
- `"PASSEPORT · PASAPORTE · REISEPASS · PASSAPORTO"` — L246 — subtítulo multilingüe (ya está en 4 idiomas por diseño, decidir si tocar)

Sin Alerts, placeholders ni botones con texto en este archivo (los touchables solo envuelven íconos).

## Passport — Interior (`app/passportinside.tsx`)

### Página 1 — "Mi recorrido" (stats)
- Sellos decorativos de fondo (en inglés, diseño de sello de pasaporte, no vinculados a idioma de la app): `"PARIS\nDEPARTURE\n15.08.2019"`, `"TOKYO\nARRIVAL\n2022"`, `"NEW YORK\nARRIVAL\n25 APR 2020"`, `"LONDON\nTRANSIT\n2021"`, `"DUBAI\nARRIVAL\n2023"` — L284-288
- `"Mi recorrido"` — L291 — título de página
- `"Continentes"` — L293
- `"Países visitados"` — L294
- `"Ciudades visitadas"` — L295
- `"Quiero visitar"` — L296
- `"Km recorridos"` — L298 (valor `"—"` si no hay datos, L299)
- `"Horas de vuelo"` — L303 (valor `"—"` si no hay datos, L304)
- Dato espacial dinámico (`getSpaceReference()`):
  - `"◉ Recorriste el {pct}% de una vuelta a {ref}"` — L246
  - `"◉ Le diste {n} vueltas a {ref}"` — L249
  - `"◉ Recorriste el {pct}% del viaje a la Luna"` — L256
  - `"◉ Le diste {n} vueltas a Júpiter"` — L262
  - `"Le diste {n} vueltas a Júpiter 🟠"` — L265
  - nombres de referencia: `"la Luna"`, `"Marte"`, `"la Tierra"`, `"Neptuno"` — L235-238
- `"✦  Cargá tus viajes para ver\n    tu dato espacial 🚀"` — L316-318 — estado vacío (sin viajes cargados)

### Página 2 — Identidad
- `"MyWorldXP"` — L334 — nombre de "país" emisor (marca)
- `"MWX · 263524"` — L335 — número de pasaporte ficticio
- `"Apellido"` — L370, `"Nombre"` — L372, `"Nacionalidad"` — L374 — labels de campo
- Rango/medalla: fallback `"Novato"` si no hay stats — L386 (valor real dinámico, viene de statsEngine)
- `"XP"` — L401 — label
- `"+{n} XP"` — L406 — XP faltante para siguiente rango
- Línea MRZ inferior estática: `"MWX263524<ARG9901014M3012315<<<<"` — L412 (la línea superior se arma dinámicamente con nombre/apellido)
- `"Tocar para cerrar"` — L416 — hint
- Sellos decorativos de fondo (inglés): `"SINGAPORE\nARRIVAL\n19.07.2018"`, `"BUENOS AIRES\nDEPARTURE\nJAN 2019"`, `"AMSTERDAM\nTRANSIT\n25.02.2019"`, `"BANGKOK\nARR\n2017"` — L327-330

Sin `Alert.alert()` ni inputs en ninguno de los dos archivos de Passport.

---

## 10. Configuración / Settings (`app/settings.tsx`)

### Header y secciones
- `"Configuración"` — L260 — título
- `"PERFIL"` — L271 — header de sección
- `"Foto de perfil"` — L284
- `"Tocar para tomar foto o elegir de galería"` — L285
- `"NOMBRE"` — L293 / placeholder `"Tu nombre"` — L299
- `"APELLIDO"` — L305 / placeholder `"Tu apellido"` — L311
- `"NACIONALIDAD"` — L317 / placeholder `"Ej: Argentina"` — L323
- `"Guardado ✓"` / `"Guardar cambios"` — L335 — botón dinámico según estado guardado

### Backup
- `"DATOS Y BACKUP"` — L340 — header de sección
- `"Backup guardado correctamente ✓"` — L145 — banner de éxito
- `"Backup restaurado correctamente ✓"` — L155 — banner de éxito
- `"El backup almacena tu perfil y todos tus viajes localmente en el dispositivo."` — L348-350
- `"Guardar backup"` — L354 (con ícono `"↓"`)
- `"Cargar backup"` — L363 (con ícono `"↑"`)
- Alert **"Error"** / `"No se pudo guardar el backup."` — L148
- Alert **"Sin backup"** / `"No se encontró ningún backup guardado en este dispositivo."` — L173
- Alert **"Backup encontrado"** — L185 (mensaje dinámico vía `buildRestoreConfirmMessage`, ver sección 11)
  - botón `"Cancelar"` — L188
  - botón `"Cargar Backup"` — L189
- Alert **"Error"** / `"El archivo de backup está dañado o no se puede leer."` — L165, L193 (repetido en 2 handlers)

### Zona de peligro
- `"ZONA DE PELIGRO"` — L368 — header
- `"Elimina permanentemente todos tus viajes, estadísticas y datos de perfil. No se puede deshacer."` — L370-372
- `"Borrar todos los datos"` — L374 (botón) y L199 (alert title)
- Alert **"Borrar todos los datos"** / `"Se eliminarán permanentemente todos tus viajes, estadísticas y datos de perfil. Esta acción no se puede deshacer."` — L199-200
  - botón `"Cancelar"` — L202
  - botón `"Borrar todo"` — L204 (destructive)

### Soporte / reportar problema
- `"SOPORTE"` — L379 — header
- `"¿Encontraste un error o algo no funciona como esperabas? Contanos qué pasó."` — L381-383
- `"Reportar problema"` — L386 (con ícono `"✉"`)
- Plantilla de email (mailto, visible para el usuario al abrirse su cliente de correo):
  - Asunto: `"Reporte de problema - MyWorldXP"` — L220
  - Cuerpo: `"Contanos qué ocurrió:"` — L222, `"¿Qué estabas haciendo cuando apareció el problema?"` — L224, `"¿Qué esperabas que pasara?"` — L226, `"¿Qué pasó realmente?"` — L228, `"Modelo de dispositivo: {info}"` — L230, `"Versión de la app: {version}"` — L231
- Alert **"No se encontró una app de correo"** / `"Podés escribirnos manualmente a:\n{email}"` — L239-240
- Alert **"No se pudo abrir el correo"** / `"Podés escribirnos manualmente a:\n{email}"` — L246-248

### Foto de perfil (selector)
- Alert **"Foto de perfil"** / `"Elegí una opción"` — L128
  - botón `"Tomar foto"` — L129
  - botón `"Elegir de galería"` — L130
  - botón `"Cancelar"` — L131
- Alert **"Error"** / `"No se pudo guardar la foto. Intentá de nuevo."` — L89
- Alert **"Permiso requerido"** / `"Necesitás permitir el acceso a la galería."` — L96
- Alert **"Permiso requerido"** / `"Necesitás permitir el acceso a la cámara."` — L113

### Footer
- `"‹"` — L258 — botón volver (ícono)
- `"MyWorldXP · v1.0"` — L390 — nombre + versión

---

## 11. Popups (Logro / Subida de nivel) y NavBar

### `components/AchievementPopup.tsx`
- `"Compartir logro"` — L46 (título del share sheet nativo) y L110 (botón)
- `"LOGRO DESBLOQUEADO"` — L77 — label superior de la tarjeta
- `"+{xp} XP"` — L97 — badge de XP ganado
- `"MyWorld"` / `"XP"` — L102-103 — marca en la tarjeta
- `"Toca para continuar"` — L114 — hint cuando hay más de un logro en cola

### `components/LevelUpPopup.tsx`
- `"Compartir nivel"` — L40 (share sheet) y L84 (botón)
- `"SUBISTE DE NIVEL"` — L57 — label superior
- `"PROGRESO"` — L62 — label de categoría
- `"Subiste de nivel"` — L64 — título de tarjeta
- `"Pasaste de {rango anterior} a {rango nuevo}"` — L66-68
- `"{n} XP para el próximo nivel"` — L72
- `"MyWorld"` / `"XP"` — L77-78 — marca

### `components/NavBar.tsx`
- `"Home"` — L70
- `"Cargar"` — L71
- `"Timeline"` — L72
- `"Stats"` — L73
- `"Mapa"` — L74

(Nota: "Home", "Timeline" y "Stats" están en inglés mientras que "Cargar" y "Mapa" están en español — inconsistencia a resolver al traducir.)

---

## 12. Motor de logros y rangos (`utils/achievementsEngine.ts`, `utils/statsEngine.ts`)

Estos textos no están en las pantallas sino en archivos de lógica, pero se muestran al usuario (en Medallero y en los popups).

### Logros — 23 en total (`nombre` / `descripcion`, categoría)

| # | Nombre | Descripción | Categoría |
|---|---|---|---|
| 1 | Primer Paso | Cargaste tu primer viaje | Progreso |
| 2 | Gran Turista | Visitaste 3 países | Progreso |
| 3 | Ciudadano del Mundo | Visitaste 10 países | Progreso |
| 4 | Colonizador | Visitaste 25 países | Progreso |
| 5 | Conquistador | Visitaste 50 países | Progreso |
| 6 | Intercontinental | Visitaste 2 continentes | Continentes |
| 7 | Globalizado | Visitaste 3 continentes | Continentes |
| 8 | Dominio Mundial | Visitaste 5 continentes | Continentes |
| 9 | Repetidor Crónico | Visitaste 10 veces el mismo destino | Comportamiento |
| 10 | Deja Vu | Volviste al mismo país 3 veces | Comportamiento |
| 11 | Visualizando | Cargaste tu primer destino por hacer | Planificación |
| 12 | Soñador | Cargaste 5 destinos por hacer | Planificación |
| 13 | Rey Estratega | Cargaste 10 destinos por hacer | Planificación |
| 14 | Cumpliendo Metas | Realizaste 1 viaje planificado | Cumplimiento |
| 15 | Cazador de Sueños | Realizaste 5 viajes planificados | Cumplimiento |
| 16 | Imparable | Realizaste 10 viajes planificados | Cumplimiento |
| 17 | Neil Armstrong | Recorriste más km que la distancia Tierra-Luna ida y vuelta | Experiencia |
| 18 | Superman | Superaste 500 horas de vuelo | Experiencia |
| 19 | Sin desarmar la valija | Cargaste 3 viajes en menos de 30 días | Actividad |
| 20 | Constante | Cargaste viajes en distintos años | Actividad |
| 21 | Marco Polo | Viajaste entre Europa y Asia | Especiales |
| 22 | Colón | Conectaste América y Europa | Especiales |
| 23 | Julio Verne | Alcanzaste 80 días de vuelo acumulados | Especiales |

(`utils/achievementsEngine.ts` L23-52; categorías también listadas en sección 7)

### Rangos / niveles — 6 en total (`utils/statsEngine.ts` L52-57)
`Novato` → `Corsario` → `Viajero` → `Trotamundos` → `Navegante` → `Astronauta`

### Continentes (`utils/statsEngine.ts` L43-48, también usados en `estadisticas.tsx`)
`América del Norte`, `América del Sur`, `Europa`, `África`, `Asia`, `Oceanía`

### Sufijos de formato numérico (`utils/statsEngine.ts`)
- `"M"` — L293 — sufijo millones de km
- `"min"` — L299 — sufijo minutos (menos de 1 hora)
- `"h"` — L300 — sufijo horas

---

## 13. Backup engine (`utils/backupEngine.ts`)

Plantillas de mensaje usadas en los Alerts de restauración de backup (Onboarding y Settings):

- `"Se encontró un backup guardado el:\n{fecha}\n\nSi continuás, todos los datos actuales serán reemplazados por el contenido de ese backup.\n\n¿Querés continuar?"` — L87 (con fecha conocida, hay datos actuales)
- `"Se encontró un backup guardado en este dispositivo.\n\nSi continuás, todos los datos actuales serán reemplazados por el contenido de ese backup.\n\n¿Querés continuar?"` — L88 (sin fecha, hay datos actuales)
- `"Se encontró un backup guardado el:\n{fecha}\n\n¿Querés restaurarlo?"` — L91 (con fecha, sin datos actuales)
- `"Se encontró un backup guardado en este dispositivo.\n\n¿Querés restaurarlo?"` — L92 (sin fecha, sin datos actuales)
- `"Estructura de backup inválida"` — L60 — mensaje de error interno que podría llegar a mostrarse si una pantalla lo captura y lo despliega

---

## 14. Timeline (`app/timeline.tsx`)

- `"Timeline"` — L286 — título de header
- `"{n} viaje(s) realizado(s)"` — L278-281 — subtítulo dinámico, pluraliza según cantidad
- `"Tus viajes realizados"` — L281 — texto alternativo (rama else, en la práctica no llega a mostrarse porque el estado vacío la reemplaza)
- `"Cargando..."` — L292 — estado de carga
- `"✈"` — L296, L184 — ícono decorativo (estado vacío / tarjeta sin foto)
- `"Todavía no hay viajes"` — L297 — título de estado vacío
- `"Cargá tu primer viaje desde la sección Cargar"` — L298-300 — hint de estado vacío
- `"{romano}"` — L169 — badge de viaje multidestino (I, II, III…)
- `"·"` — L196 — separador entre país y fecha

> Nota: el formato de fecha usa `toLocaleDateString('es-AR', {...})` (L197) — el locale "es-AR" queda fijo sin importar el idioma que elija el usuario; hay que parametrizarlo cuando se agregue inglés.

---

## Resumen y observaciones para la próxima etapa (traducción / i18n)

**Volumen aproximado:** ~250+ strings/templates únicos relevados en 20 archivos (14 pantallas/componentes + 2 engines de lógica).

**Duplicados a unificar en una sola clave i18n:**
- `"Cancelar"` (aparece en al menos 8 Alerts distintos, en cargar.tsx, detalle.tsx, profile.tsx, settings.tsx, mapa.tsx)
- `"Error"` (título de Alert, ~6 lugares distintos)
- `"Elegir de galería"` / `"Tomar foto"` (selector de foto, repetido en profile.tsx, settings.tsx, detalle.tsx, cargar.tsx)
- `"Permiso necesario"` / `"Permiso requerido"` (mismo concepto, dos textos ligeramente distintos entre cargar.tsx/detalle.tsx vs settings.tsx — conviene unificar)
- `"Guardando..."` / `"Guardar"` (patrón botón guardar con estado loading, repetido en detalle.tsx)
- `"No se pudo guardar. Intentá de nuevo."` y variantes "No se pudo guardar." (varios handlers en detalle.tsx y cargar.tsx)
- `"El archivo de backup está dañado o no se puede leer."` (onboarding.tsx y settings.tsx, dos veces cada uno)
- `"viaje"`/`"viajes"`, `"vez"`/`"veces"` — pares de pluralización a tratar con reglas de plural, no concatenación simple

**Inconsistencias de idioma detectadas (ya existentes, no introducidas por este relevamiento):**
- `components/NavBar.tsx`: `"Home"`, `"Timeline"`, `"Stats"` están en inglés; `"Cargar"`, `"Mapa"` en español — falta de criterio único.
- Sellos decorativos de fondo en `passportinside.tsx` (PARIS/DEPARTURE, TOKYO/ARRIVAL, etc.) están en inglés a propósito (diseño de sello de pasaporte) — decidir si se dejan así (recomendado, es un elemento visual/decorativo) o se traducen igual.
- `app/(tabs)/explore.tsx` y `app/modal.tsx` son pantallas boilerplate de Expo Router en inglés, aparentemente sin uso real en la navegación de la app — confirmar si se pueden eliminar en vez de traducir.

**Textos con interpolación (necesitan plantillas con placeholders en el sistema de i18n, no reemplazo simple):**
- Mensajes de `buildRestoreConfirmMessage` (backupEngine.ts)
- Frases del "dato espacial" en `passportinside.tsx` (`getSpaceReference()`)
- Casi todos los mensajes de validación de `cargar.tsx` que incluyen `Destino {romano}: ...`
- Contadores tipo `"{n} de {total} logros desbloqueados"`, `"{n}/1000"`, `"+{n} XP"`, etc.

**Fuera del alcance de traducción (nombres propios / marca):**
- `"MyWorldXP"`, `"MyWorld"` + `"XP"`, `"CONFIG"`, número de pasaporte `"MWX · 263524"` y línea MRZ, listado de `CIUDADES` (nombres de ciudades/países), nombres de logros y rangos (a definir si se traducen como "flavor text" o se mantienen — son nombres de producto/gamificación, no UI funcional).

El documento completo con el detalle línea por línea de las 14 pantallas quedó guardado en:
`I18N_INVENTORY.md` (raíz del proyecto).

