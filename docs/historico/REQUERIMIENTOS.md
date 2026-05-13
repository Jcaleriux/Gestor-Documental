## Estado del documento

> Historico. Este archivo conserva el levantamiento inicial y las respuestas base con las que arranco el proyecto.
>
> No debe usarse como especificacion vigente unica ni como contrato tecnico actual.
>
> Para el estado actual del sistema consultar:
>
> - `docs/requerimientos_vigentes.md`
> - `docs/arquitectura/01_vision_y_alcance.md`
> - `docs/arquitectura/05_catalogo_estados.md`
> - `docs/arquitectura/06_matriz_permisos.md`
> - `README.md`

Requisitos funcionales (RF)
1. Preguntas sobre Usuarios y Roles
1.	¿Qué tipos de usuarios existirán en el sistema?
1.	Administrador
2.	Gerente financiera, contable,
3.  Gerente construcción, presupuesto, inmobiliaria, mercadeo, ventas, Infraestructura, proyecto (Todos con acceso limitado a sociedad a cargo).
3.	Contabilidad auxiliar y jefe
4.	Tesorería auxiliar y jefe
5.	proveeduría
6.	Asistencia 
7.	Personalizado.

2.	¿Cada usuario pertenece a un solo grupo o puede tener múltiples grupos?
1.	Pertenece a un solo grupo

3.	¿Cuáles permisos específicos tiene cada grupo?
1.	Administrador: Acceso total a la aplicación.
2.	Gerente:
1.	Financiero: Acceso a todas las sociedades.
2.	Contable: Acceso a todas sociedades asignadas.
3.	Construcción: Acceso a las sociedades asignadas.
4.	Presupuesto: Acceso a las sociedades asignadas.
5.	Mercadeo : Acceso a las sociedades asignadas.
6.	Ventas: Acceso a las sociedades asignadas.
7.	Infraestructura: Acceso a las sociedades asignadas.
8.	Proyecto: Acceso a las sociedades asignadas. 
3.	Contabilidad: 
1.	Jefe: Acceso a todas las sociedades.
2.	Asistente: Acceso a las sociedades asignadas.
4.	Tesorería: 
1.	Encargado: Acceso a todas las sociedades.
2.	Auxiliar: Acceso a las sociedades asignadas.
5.	Proveeduría: Acceso a las sociedades asignadas.
6.	Asistencia: Acceso a las sociedades asignadas.
7.	Personalizado: Acceso a las sociedades asignadas.

4.	¿Hay jerarquías entre grupos (por ejemplo, Admin > Gerencia)?
1.	Si: Admin>Gerencia financiera>Gerencia contable, Gerente financiera, contable, construcción, presupuesto, mercadeo, ventas y Infraestructura y proyectos.>Contabilidad, Tesorería, proveeduría>Asistencia.
2.	Personalizado.

5.	¿Quién administra los usuarios y grupos?
1.	El admin, las gerencias y las jefaturas. (Respetando la jerarquía).
6.	¿Los usuarios pueden editar su propia información?
1.	No, solo el Admin. 
7.	¿Los usuarios necesitan autenticación multifactor (MFA)?
1.	Sí, por medio de código al correo.
________________________________________
2. Preguntas sobre Sociedades y Acceso
1.	¿Un usuario puede acceder a una o varias sociedades?
1.	Sí.
2.	¿Quién decide qué usuario tiene acceso a qué sociedad?
1.	El admin, las gerencias y las jefaturas. (Respetando la jerarquía).
3.	¿Un usuario puede cambiar rápidamente entre sociedad desde la interfaz?
1.	Sí, una ventana que aparece al presionar un botón “Sociedad”.
4.	¿Cada acción (subir documentos, cambiar estado, comentar) debe estar asociada a una sociedad?
1.	Sí, cada documento está ligado únicamente a una sociedad. 
________________________________________
3. Preguntas sobre Gestión de Documentos PDF
1.	¿Qué formatos de archivo están permitidos?
1.	PDF, XML, png, jpg y jpeg.
2.	¿Existe un tamaño máximo de archivo?
1.	No.
3.	¿Quién puede subir documentos?
1.	Todos, pero depende del rol varían los documentos que pueden subir. Cada usuario tendrá una interfaz diferente dependiendo de su rol.
4.	¿Quién puede ver los documentos?
1.	Todos, pero cada rol tiene distintas posibilidades como firmar para autorizar o revisar, editar(agregar información de respaldo del pago) o incluir a un grupo(Agrupar por propuesta de pago)
5.	¿Quién puede descargarlos?
1.	Todos.
6.	¿Los documentos tienen versiones? (¿si suben uno nuevo, reemplaza o crea una versión?)
1.	Tienen versiones, cada cambio que se guarde crea una nueva versión. Deja un Log del usuario con hora, fecha y nombre.
7.	¿Los documentos pueden eliminarse? ¿Quién puede hacerlo?
1.	No, se crea alguna nota o estado de documento anulado. Ya se que si es una factura por una Nota de crédito o si es otro documento simplemente anulado, siempre y cuando no tenga también una transacción relacionada como por ejemplo que este en estado pagada.
8.	¿Los documentos deben tener metadatos adicionales? (fecha, proveedor, monto, etc.)
Sí, la mayoría extraídos del archivo XML los otros son ingresados a la hora de contabilizar el documento por el asistente contable como la “Retención”, “Plazos”, “Fecha de vencimiento de la factura”, entre otros(los voy a definir a la hora de hacer la base de datos, que tiene que tener la posibilidad de agregar más metadatos).
1.	Número de factura
2.	Fecha de emisión
3.	Fecha de recepción
4.	Proveedor
5.	Monto total
6.	Subtotal
7.	Impuesto
8.	Retención
9.	Anticipo Aplicado
10.	Moneda(Colones o dolares)
11.	Centro de costo
12.	Cuenta contable
13.	Proyecto asociado
14.	Estado: contabilizado / no contabilizado / pagado / en tramite / en aprobación / En revisión por “X”.
15.	Fecha de vencimiento
16.	Fecha de documento
17.	Fecha de contabilización
18.	Número de proveedor
19.	Opción de agregar más metadatos a futuro.
9.	¿Se requiere un visor PDF dentro de la app o se abre en pestaña externa?
1.	Sí, todo dentro de la app, también puede abrirlo en pestañas externas o aplicaciones externas, o descargarlo editarlo en la aplicación que guste y subirlo nuevamente(Esto crea una nueva versión también)
________________________________________
4. Preguntas sobre Estados del Documento
1.	¿Qué estados existen? 
1.	“No contabilizado”,
2.	“Contabilizado”
3.	“Rechazado”
4.	“En revisión”
5.	“En trámite de pago”
6.	“En aprobación de gerencia”
7.	“Pagado”
2.	¿Quién puede cambiar cada estado?
1.	El estado lo cambia cada usuario en su rol, por ejemplo si contabilidad lo registra puede cambiar a “Contabilizado” pero no a “Pagado”, con el estado “Contabilizado” puede “pasarlo a cargo del departamento que sigue por ejemplo pasaría a estar a cargo de Tesorería.
3.	¿Se requiere un historial de cambios de estado?
1.	Sí, con usuario, fecha y hora en que se cambió el estado.
4.	¿Se deben generar notificaciones al cambiar el estado?
1.	Sí, pero como avisos en pantalla que adviertan sobre los cambios, más sí el cambio modifica un documento con una transacción o de un periodo cerrado, etc.
________________________________________
5. Preguntas sobre Comentarios
1.	¿Quién puede agregar comentarios?
Todos en especial lo que revisan pero debe de haber un diferenciador para quien deja el comentario, para tener como un historial del documento dentro de la aplicación para darle seguimiento o sugerir correcciones.
2.	¿Los comentarios pueden editarse? ¿O solo agregarse?
Solo agregarse. Para evitar modificaciones que comprometan el historial.
3.	¿Los comentarios pueden eliminarse?
No.
4.	¿Los comentarios deben tener fecha, autor e historial?
Sí.
5.	¿Los comentarios deben ser visibles para todos o solo ciertos grupos?
Para todos los que tengan acceso al documento o sociedad.
________________________________________
6. Preguntas sobre Firmas Digitales
1.	¿Qué tipo de firma se requiere?
o	Firma dibujada a mano - Sí
o	Firma con certificado digital – Si es posible, sí.
o	Firma basada en contraseña – Sí también.
2.	¿Se permite más de una firma por documento?
Sí.
3.	¿Quién puede firmar?
Solo la persona en la que recae el documento, por ejemplo, si contabilidad lo contabilizo, el documento “pasa a estar a cargo de tesorería” y Tesorería “lo pasaría a aprobación de los gerentes de proyecto”.
4.	¿Firmar cambia automáticamente el estado del documento?
En el caso de los gerentes sí, debe de haber un botón que diga “Firmar” o “Aprobar”, que automáticamente va a rellenar el espacio predeterminado para el espacio de la firma. Firma que anteriormente fue configurada por él Admin.
5.	¿Las firmas deben bloquear el documento para cambios?
Sí, una vez aprobado solo puede cambiar a pagado o cancelado con nota de crédito, pero no se puede anular o eliminar.
6.	¿Se necesita validar la integridad del PDF después de la firma?
Sí.

________________________________________
7. Preguntas sobre Auditoría e Historial
1.	¿Qué acciones deben quedar registradas?
Todas las modificaciones que se guarden. Ya sea actualizaciones al los documentos o movimientos, por ejemplo, Tesorería envío a aprobación, Gerente aprobó, Etc.
2.	¿Se necesita registrar IP, fecha, usuario?
Sí.
3.	¿Se necesita un módulo para ver auditoría?
Sí, una ventana llamada “Log de modificaciones”. En ella se va a ver:
Instancia,	Código de objeto,	Actualizado, Actualizado por - Código de usuario, Actualizado por - Nombre de usuario, Fecha/hora de actualización, Creado, Creado por - Nombre de usuario, Creado por - Código de usuario, Fecha/hora de creación.
4.	¿La auditoría caduca o es eterna?
Es eterna.
________________________________________
8. Preguntas sobre Seguridad
1.	¿Debe haber encriptación de archivos en reposo?
No.
2.	¿El sistema debe conectarse solo por HTTPS?
Sí.
3.	¿Los PDF deben almacenarse en la base de datos o en sistema de archivos?
En la base de datos.
4.	¿Hay que aplicar restricciones anti-descarga o marca de agua?
No.
5.	¿Se necesita validar el tipo de archivo para evitar malware?
Sí.
________________________________________
9. Preguntas sobre Integración con Otros Sistemas
1.	¿El sistema se integrará con ERP, contabilidad o sistemas externos?
De momento no, pero si a futuro que esté la posibilidad.
2.	¿Se necesitan API para subir archivos desde otro software?
Sí.
3.	¿Se debe enviar correos automáticos?
Sí.
4.	¿Se requiere exportar datos a Excel/PDF/CSV?
Sí.
________________________________________
10. Preguntas sobre Flujo de Trabajo (Workflow)
1.	¿Cuál es el flujo ideal desde subir hasta contabilizar un documento?
La idea del flujo “ideal” de trabajo desde 0 de una factura sería de esta forma(Aunque puede variar ya que en algunos casos y dependiendo del documento algunos pasos pasan a ser manuales.) 

Descarga y clasificación de los documentos:
a.	La factura llega al buzón de correo electrónico. (Se realiza que cumpla con los requisitos es decir que es una factura electronica)
b.	Se descargan los 3 archivos PDF, XMl y XML respuesta de hacienda.
c.	Se leen los XML para definir algunos metadatos como a que sociedad pertenecen “Receptor”, “Emisor”, etc.
d.	(Separados en un “paquete” ya que los 3 documentos deben de tratarse juntos, es decir se deben de mover juntos teniendo el mismo numero de consecutivo, cambiando únicamente la extensión y en el caso de XML de respuesta de hacienda con RH al inicio del nombre).
e.	Se cargan en la base de datos de la sociedad a que corresponden.

Contabilización:
f.	Al auxiliar contable en su dashboard tendrá una sección de documentos pendientes de contabilizar donde aparecerán los documentos recibidos.
g.	El auxiliar contable da a un botón donde dice “contabilizar” donde aparecerá precargado todos los metadatos de la factura leídos en el XML, y tendrá algunos espacios que deberá completar con otros metadatos solicitados. Por ejemplo una casilla donde dice “Orden de Compra” al dar click despliega una ventana que muestra las ordenes de compras creadas al proveedor por proveeduría. Y así para Cuenta contable, donde se despliega la lista de Cuentas contables de la sociedad a la cual el documento debe afectar. Asi con el Centro de costo. También debe haber una casilla para definir los plazos(Se ingresa manual), % de retención (Manual), % de descuento (Manual) y otros datos más. (Dejar posibilidad para agregar más datos).
h.	El asistente contable da contabilizado y el documento ahora pasa a tesorería.

Tesorería:
i.	El documento contabilizado aparece en el dashboard de tesoreria de documentos pendientes de pago, de la sociedad en la que este.
j.	Debe tener un botón que diga “Tramitar” y cada documento tener un casilla para seleccionar uno, dos, varios o todos los documentos.
k.	Al dar a botón tramitar se muestra un resumen de los documentos seleccionados, después de revisar visualmente puede dar al botón “Enviar a Aprobación”.
Aprobación
l.	El gerente a cargo del centro de costo le aparece el documento en su dashboar como “documentos pendientes de autorizar”.
m.	Cada documento debe tener un botón que diga “Revisar”
n.	Al clickar en “revisar” se abre el documento en un visor a la derecha de la pantalla, y con toda la información a la izquierda en columnas(La Info relevante para la revisión del gerente como “Centro de costo”, “monto”, “rentencion”, “notas de crédito aplicadas”  y otros que se definen con base a la contabilización).
o.	Una vez revisado debe dar click en “firmar y autorizar” que va a llenar el un espacio predefinido para la firma (dibujo digital o foto).
p.	El documento pasa a una sección de documentos autorizados y pasa de nuevo a tesoreria.
Tesorería:
q.	En el dashboard de tesoreria de “tramites de pago” se pone un botón verde si todos los documentos fueron aprobados, amarillo si algunos fueron aprobados y otros no, rojo si ninguno fue aprobado.
r.	Después de eso tesorería revisa los documentos no autorizados si los hubieron, los mueve a “no autorizados” para revisión, los demás, una vez revisado lo que se va a tramitar con su flujo de caja, da el botón “Enviar a autorización” que lo envía a autorización del gerente contable.
Gerente contable:
s.	En el dashboard de gerente cotable en la sección “Tramites de pago pendientes de autorización” aparecen los tramites pasados por tesorería.
t.	Da al botón “Revisar” donde se abre un resumen de el tramite de pagos, donde tiene que abrir cada documento 1 por uno para darle “Autorizar documento” o “no autorizar”. Una vez revisa todo puede dar al botón “Continuar”, que separa los autorizados y no en un resumen y al final el botón “Enviar a Tesorería”.

Tesorería:
u.	En el dashboard de tesoreria de “tramites de pago” se pone un botón verde si todos los documentos fueron aprobados, amarillo si algunos fueron aprobados y otros no, rojo si ninguno fue aprobado. Nuevamente.
v.	Después de eso tesorería revisa los documentos no autorizados si los hubieron, los mueve a “no autorizados” para revisión.
w.	Una vez revisados da a un botón “Pagar”, que genera el archivo xlsx que contiene los datos para subir al banco. Que a su vez envía el tramite a el gerente financiero.
Gerente financiero:
x.	En el dashboard de gerente financiero en la sección “Tramites de pago pendientes de aplicar” aparecen los tramiten enviados a pago por tesorería, donde tiene un botón que puede “revisar”, o dar “pagado”.
continúan algunos detalle más por agregar y mejorar.
2.	¿Qué pasa cuando un documento es rechazado?
Queda en una sección de documentos rechazados por hacienda, y si es no autorizado en una sección llamada no autorizados.
3.	¿Se pueden crear tareas para usuarios?
Sí, cada movimiento le genera una tarea a cada usuario encargado de cada proceso.
4.	¿Se necesita dashboard con métricas?
Sí cada usuario tiene un dasboard con métricas.
________________________________________
11. Preguntas sobre Interfaz de Usuario
1.	¿Debe ser responsive (móvil/tablet)?
Sí.
2.	¿Debe haber filtros avanzados por fecha, compañía, estado, usuario?
Sí.
3.	¿Hay que mostrar vistas específicas para cada rol?
Sí.
4.	¿Los usuarios necesitan un panel con notificaciones?
Sí.
________________________________________
12. Preguntas sobre Despliegue y Escalabilidad
1.	¿Cuántos usuarios usarán la plataforma simultáneamente?
Todos a la vez, son en este momento 200 empleados. Pero esperamos que sirva para más en un futuro.
2.	¿Cuántos documentos se esperan por día/mes?
100 minimo por semana por sociedad.
3.	¿Dónde se va a desplegar? AWS, Azure, local?
Acá usan bases de datos de Azure por lo que seguimos sobre la misma base.
4.	¿Habrá backups automáticos?
Sí.
5.	¿Se necesita tolerancia a fallos?
Sí, pero más que todo mostrar notificaciones de error para corregir en el momento.

Requisitos no funcionales (RNF)
1.	Tener una capacidad de mínimo 100 usuarios concurrentes.
2.	Almacenar los PDF’s y firmas de forma segura.
3.	Un backend con una respuesta de menos de 300ms.
4.	Base de datos que permita auditorías.
5.	Seguridad con JWT y roles.
Diseño y arquitectura del sistema
1.	¿Cómo se comunica el frontend con el backend?
2.	¿Dónde se guardan los PDFs? (local, S3, NAS, etc.)
3.	¿Cómo se organizan los módulos del backend?
4.	¿Cómo se maneja la autenticación y autorización?
5.	¿Qué herramientas se usarán para despliegue?
Diseño de la base de datos
1.	índices
2.	claves únicas
3.	manejo de borrado
4.	políticas de seguridad
5.	auditorías
6.	extensiones de PostgreSQL necesarias
7.	¿Los documentos solo se relacionan con una compañía, o pueden estar relacionados con más de una? Sí, solo a la compañía que fue emitido.
8.	¿Quién puede ver un documento contabilizado? Todos pueden ver documentos, pero para consultas, otros para edición, en el caso de tesorería para mover a pagos y de ahí el encargado puede cambiar el estado.
9.	¿Debe registrarse el historial de cambios de estado? Sí absolutamente.
10.	¿Necesitas bitácoras de auditoría? (En contabilidad normalmente sí). Sí, ver tema con don Luis.
Flujos del usuario (UX / casos de uso)
Caso de uso CU1 — Subir un PDF
1.	Usuario Contabilidad inicia sesión.
2.	Selecciona la compañía a la que tiene acceso.
3.	Clic en “Subir documento”.
4.	Selecciona archivo PDF.
5.	El sistema guarda documento + metadatos.
6.	El usuario ve el documento en la lista de esa compañía.
Esto debe existir para cada acción clave.

Criterios de éxito / pruebas
1.	Cómo sabremos que funciona.
2.	Qué pruebas se van a ejecutar.
3.	Qué errores no son aceptables.
