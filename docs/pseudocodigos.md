// PSEUDOCODIGO 

// PARA CLASES BASE DE VOs E IDENTIFIERS:
CLASE ABSTRACTA BaseValueObject<T>

  PROPIEDADES:
    - protegida e inmutable props: T
    - pública e inmutable voType: String (abstracta)

  CONSTRUCTOR PROTEGIDO (props: T)
    - Si props es Objeto -> Congelar (Object.freeze)
    - Sino -> Asignar directo

  GETTER PÚBLICO value() -> T
    - Retorna props

  MÉTODO PÚBLICO equals(otroVo?: BaseValueObject<T>) -> Booleano
    - Guardia Nula: Si otroVo no existe -> Retorna False
    - Guardia Instancia: Si otroVo no hereda de BaseValueObject -> Retorna False
    - Guardia Tipo: Si este.voType != otroVo.voType -> Retorna False
    - Retorna:
        * Si es Primitivo: Compara por valor estricto (===)
        * Si es Objeto: Compara por profundidad (deepEqual)

// PARA CLASES QUE EXTIENDAN DE LA BASE VOs
CLASE ESPECÍFICA [NombreVo] EXTIENDE BaseValueObject<TipoDato>

  PROPIEDADES:
    - pública e inmutable voType = "[NombreVo]"
    - [OPCIONAL] Estáticas de Dominio publicas: Constantes de negocio (ej. ACTIVE, SUSPENDED) (SOLO LECTURA)

  CONSTRUCTOR PRIVADO (valor: TipoDato)
    - Delega al super(valor)

  FÁBRICA ESTÁTICA create(input: TipoDato) -> [NombreVo]
    1. Sanitización: Normalizar formato (trim, toLowerCase/toUpperCase, etc.)
    2. Guardia 1 (Presencia): Si está vacío -> Lanza Error de Dominio (REQUIRED)
    3. [OPCIONAL] Guardia 2 (Formato/Regla): Si falla Regex/Regla -> Lanza Error de Dominio
    4. [OPCIONAL] Guardia 3 (Lista/Enum): Si no está en lista permitida -> Lanza Error de Dominio
    5. Instanciación: Retorna new [NombreVo](valorSanitizado)

  [OPCIONAL] MÉTODOS DE NEGOCIO (Predicados de Lectura):
    - Métodos semánticos que evalúan this.value/this._props (ej. isActive(), isHighPriority())


CLASE ABSTRACTA UniqueIdentifier EXTEND BaseIdentifier<String>

  PROPIEDADES:
    - Expresión Regular privada y estática (UUID_v4_REGEX)

  CONSTRUCTOR PROTEGIDO (id: String)
    - Ejecuta validación estática: UniqueIdentifier.validate(id)
    - Delega al super(id)

  MÉTODO ESTATICO validate(id: String, fieldName = "id")
    - Guardia de Formato: Evalúa id contra UUID_v4_REGEX
    - Si falla -> Lanza Error de Dominio (CommonErrorFactory con detalle del campo)

  MÉTODO TO_STRING()
    - Retorna este.value (para serialización limpia)


CLASE ABSTRACTA BaseDomainError EXTENDE Error

  PROPIEDADES:
    - pública e inmutable name: String
    - pública e inmutable date: String

  CONSTRUCTOR PROTEGIDO (
      message: String,
      errorType: DomainNames,
      internalCode: String,
      code: String,
      isOperational: Boolean,
      metaData?: ErrorMetaData
  )
    1. Delega al super(message)
    2. Asigna name = nombre de subclase instanciada
    3. Asigna date = timestamp ISO actual
    4. Ajuste de Prototipo: Object.setPrototypeOf(this, new.target.prototype)
    5. Captura StackTrace limpio: Error.captureStackTrace(this, constructor)

  SERIALIZACIÓN toJSON() -> Objeto
    - Mapea name, date, message, errorType, internalCode, code, isOperational
    - Adjunta metaData SOLO si está presente
    - Adjunta stack SOLO si entorno === "development"

  
CLASE ESPECÍFICA [Domain]DomainError EXTENDE BaseDomainError

  CONSTRUCTOR (
      message: String,
      internalCode: DomainErrorCode,
      errorKey: String,
      metaData?: ErrorMetaData
  )
    - Delega al super(
        message,
        "[NOMBRE_DEL_DOMINIO]", // Ej: "PROJECT", "USER"
        internalCode,
        errorKey,
        true,                   // isOperational siempre en true
        metaData
      )


CLASE ABSTRACTA BaseEntity<I extiende UniqueIdentifier, T>

  PROPIEDADES:
    - protegida e inmutable _id: I
    - protegida e inmutable _props: T
    - protegida e inmutable createdAt: DateVo
    - protegida y mutable   updatedAt: DateVo

  CONSTRUCTOR PROTEGIDO (id: I, props: T, createdAt?: DateVo, updatedAt?: DateVo)
    1. Asigna _id y _props
    2. Trazabilidad:
       - createdAt = createdAt ?? DateVo.create()
       - updatedAt = updatedAt ?? DateVo.create()

  GETTERS:
    - público id() -> I
    - abstracto entityType() -> String

  CICLO DE VIDA:
    - protegido markAsUpdated() -> Reasigna updatedAt con DateVo.create()

  IGUALDAD POR IDENTIDAD equals(objeto?: BaseEntity<I, T>) -> Booleano
    - Guardia Nula: Si objeto no existe -> Retorna False
    - Guardia Instancia: Si no hereda de BaseEntity -> Retorna False
    - Guardia Tipo: Si este.entityType != objeto.entityType -> Retorna False
    - Retorna: este._id.equals(objeto._id)


CLASE ESPECÍFICA [NombreEntidad] EXTENDE BaseEntity<[EntityIdVo], [EntityProps]>

  IDENTIFICADOR DE TIPO:
    - getter entityType() -> Retorna "[NombreEntidad]"

  PROPIEDADES ADICIONALES (OPCIONALES):
    - privada e inmutable _relacionExternaId?: [OtraEntidadIdVo]

  CONSTRUCTOR PRIVADO (props: [EntityProps], id: [EntityIdVo], createdAt?, updatedAt?, relacionExternaId?)
    1. Delega al super(id, props, createdAt, updatedAt)
    2. Asigna relaciones adicionales opcionales (_relacionExternaId = relacionExternaId)

  FÁBRICA DE CREACIÓN (create) -> Para entidades NUEVAS en el sistema
    - Parámetros: props: [EntityProps], id opcional
    - Lógica:
        * idFinal = id existente O [EntityIdVo].create()
        * Retorna nueva instancia pasando (props, idFinal)
        * (Las fechas createdAt y updatedAt se generan automáticamente en la BaseEntity)

  FÁBRICA DE RECONSTITUCIÓN (reconstitute) -> Para revivir entidades desde BD
    - Parámetros: props, id OBLIGATORIO, createdAt OBLIGATORIO, updatedAt OBLIGATORIO, relaciones opcionales
    - Lógica:
        * Retorna nueva instancia pasando todo el estado intacto al constructor privado
        * (Preserva exactamente las fechas y el ID originales de la base de datos)

  GETTERS DE DOMINIO:
    - Exponen las propiedades internas deshojando _props o atributos privados

  CONVERSIÓN A PRIMITIVOS (toPrimitives) -> Objeto Plano (POJO)
    - Desempaqueta cada Value Object llamando a .value
    - Retorna objeto con datos nativos (string, number, boolean) listo para mappers o JSON


INTERFAZ GENÉRICA BaseUseCase<Input, Output>

  MÉTODO CONTRATO:
    - execute(input: Input) -> Promesa<Output>


CLASE ESPECÍFICA [Accion][Entidad]UseCase IMPLEMENTA BaseUseCase<[Accion]Input, [Accion]Output>

  CONSTRUCTOR (
      privado e inmutable repositorioEntidad: I[Entidad]Repository,
      privado e inmutable otrosRepositorios: IOtroRepository,
      privado e inmutable unitOfWork: IBaseUnitOfWork
  )

  MÉTODO ASÍNCRONO execute(input: [Accion]Input) -> Promesa<[Accion]Output>
    1. Instanciar VOs / Entidades de Dominio desde el input.
    2. Consultar Repositorios para validar precondiciones / existencia.
    3. Ejecutar lógica de negocio sobre las Entidades.
    4. Persistir mediante el Repositorio (o UnitOfWork si requiere transacción).
    5. Retornar el Output DTO formateado.


Transacciones Implicitas con ALS y Unit of Work

================================================================================
1. ALMACÉN DE CONTEXTO ASÍNCRONO (TransactionStorage<T>)
================================================================================
PROPIEDADES:
  - privada almacenamiento: Instancia de AsyncLocalStorage<T>

MÉTODOS PÚBLICOS:
  - run(transaccion: T, callback: () -> Promesa<R>) -> Promesa<R>
      Lógica: Ejecuta el callback envolviéndolo en el hilo asíncrono atado a la transacción.

  - getStore() -> T | undefined
      Lógica: Retorna la transacción activa en el contexto del hilo actual (o undefined).

INSTANCIA GLOBAL:
  - exportar constante txStorage = nueva TransactionStorage<ClienteTransaccion>()


================================================================================
2. UNIDAD DE TRABAJO CONCRETA (PrismaUnitOfWork IMPLEMENTA IBaseUnitOfWork)
================================================================================
CONSTRUCTOR:
  - privado e inmutable prisma: ClientePrisma

MÉTODO ASÍNCRONO run<T>(operaciones: () -> Promesa<T>) -> Promesa<T>:
  1. Inicia bloque transaccional atómico en el ORM:
     retornar prisma.$transaction(asíncrono (tx) => {
         
         2. Inyecta el cliente 'tx' en el ALS y ejecuta las operaciones:
         retornar txStorage.run(tx, operaciones)
     })


================================================================================
3. REPOSITO BASE DE INFRAESTRUCTURA (BasePrismaRepository)
================================================================================
CONSTRUCTOR:
  - protegido e inmutable prisma: ClientePrisma

MÉTODO PROTEGIDO getClient() -> ClientePrisma | ClienteTransaccion:
  1. Consulta el contexto activo en el ALS:
     transaccionActiva = txStorage.getStore()

  2. Evaluación de cliente:
     SI transaccionActiva existe ENTONCES:
         Retornar transaccionActiva (Asegura ejecución dentro de la transacción)
     SINO:
         Retornar este.prisma (Ejecución estándar fuera de transacción)