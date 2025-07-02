const IEventParserInfrastructure = require('../../domain/calendar/interfaces/IEventParserInfrastructure');
const DomainEventDetails = require('../../domain/calendar/models/DomainEventDetails');
const DomainEvent = require('../../domain/calendar/models/DomainEvent');
const DomainEventQuery = require('../../domain/calendar/models/DomainEventQuery');
const { _combineDateAndTime, getCurrentDateInfo } = require('./utils/utils');
const { DEFAULT_TITLE_DESCRIPTION_INSTRUCTIONS } = require('./utils/prompt_utils');
const { z } = require('zod');

/**
 * Concrete implementation of IEventParserInfrastructure using LLM for parsing event details.
 */
class EventParserInfrastructure extends IEventParserInfrastructure {
    /**
     * @param {Object} llm - The language model instance to use for parsing
     */
    constructor(llm) {
        super();
        if (!llm) {
            throw new Error('LLM instance is required');
        }
        this.llm = llm;
    }

    /**
     * Classifies the event type from natural language text
     * @param {string} text - The text to classify
     * @returns {Promise<string>} - 'timed', 'allDay', or 'unclear'
     */
    async _classifyEventType(text) {
        const ClassificationSchema = z.object({
            eventType: z.enum(['timed', 'allDay', 'unclear']).describe("Classification of the event type"),
            confidence: z.number().min(0).max(1).describe("Confidence level of the classification"),
            reasoning: z.string().describe("Brief explanation of the classification")
        });

        const prompt = `Classify the following text as one of these event types:

        1. "timed" - Event has specific start/end times (e.g., "meeting at 2pm", "appointment from 10-12")
        2. "allDay" - Event spans full days without specific times (e.g., "vacation next weekend", "conference all day", "holiday")
        3. "unclear" - Insufficient information to determine

        Look for keywords like:
        - Timed: "at", "from", "to", "between", "until", "o'clock", "am/pm", specific times
        - All-day: "all day", "all-day", "vacation", "holiday", "conference", "trip", "weekend", "multi-day"

        Text: "${text}"

        Return the classification with confidence level and reasoning.`;

        try {
            const structuredLLM = this.llm.withStructuredOutput(ClassificationSchema);
            const response = await structuredLLM.invoke(prompt);
            return response.eventType;
        } catch (error) {
            console.error('Error classifying event type:', error);
            return 'unclear';
        }
    }

    /**
     * Parses a timed event with specific start/end times
     * @param {string} text - The text to parse
     * @param {string} timezone - The timezone for date calculations
     * @returns {Promise<DomainEvent|null>} - Parsed event or null if failed
     */
    async _parseTimedEvent(text, timezone) {
        try {
            // Get current date in the specified timezone
            const dateInfo = getCurrentDateInfo(timezone);
            const currentDate = dateInfo.currentDate;

            // Define the structured output schema for timed events
            const TimedEventSchema = z.object({
                success: z.boolean().describe("Si el texto contiene información válida de evento con hora"),
                data: z.object({
                    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Fecha del evento en formato YYYY-MM-DD"),
                    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).describe("Hora de inicio del evento en formato HH:MM (24 horas)"),
                    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional().describe("Hora de fin del evento en formato HH:MM (24 horas) - REQUERIDO cuando hasDuration es false"),
                    duration: z.number().optional().describe("Duración del evento en horas - REQUERIDO cuando hasDuration es true"),
                    hasDuration: z.boolean().describe("Establece como true si el usuario mencionó explícitamente la duración (ej., 'por 1 hora'), false si el usuario proporcionó un rango de tiempo (ej., '10-2')"),
                    description: z.string().describe("Sé exhaustivo en la descripción. Incluye todos los detalles del evento proporcionado de manera pulida y clara."),
                    title: z.string().describe("Título corto del evento.")
                }).optional().describe("Datos del evento (solo presente si success es true)"),
                error: z.string().optional().describe("Mensaje de error (solo presente si success es false)")
            });

            const timezoneInfo = timezone ? ` en zona horaria ${timezone}` : '';
            const prompt = `Analiza el siguiente texto para extraer detalles de evento con hora. Extrae fecha, hora de inicio, hora de fin, duración, descripción y título.
                La fecha actual${timezoneInfo} es ${currentDate}. Usa esto como referencia para fechas relativas como "mañana" o "la próxima semana".
                
                ${DEFAULT_TITLE_DESCRIPTION_INSTRUCTIONS}
                
                REGLAS PARA MANEJAR HORAS:
                1. Si el usuario menciona explícitamente la duración (ej., "por 1 hora", "2 horas", "30 minutos"):
                   - Establece hasDuration = true
                   - Establece duration = la duración mencionada en horas
                   - Establece endTime = null (no necesario)
                
                2. Si el usuario proporciona un rango de tiempo (ej., "10-2", "10am a 2pm", "entre 3 y 5"):
                   - Establece hasDuration = false
                   - Establece startTime = hora de inicio en formato HH:MM
                   - Establece endTime = hora de fin en formato HH:MM
                   - Establece duration = null (no necesario)
                
                3. Si el usuario no proporciona ni duración ni hora de fin:
                   - Establece success = false
                   - Proporciona mensaje de error pidiendo detalles de tiempo
                
                EJEMPLOS:
                - "reunión mañana a las 2pm por 1 hora" → hasDuration=true, duration=1, endTime=null
                - "reunión mañana 10-2" → hasDuration=false, endTime="14:00", duration=null
                - "reunión mañana a las 2pm" → success=false (sin duración ni hora de fin)
                
                Reglas:
                - Si el texto contiene información válida de evento con detalles de tiempo suficientes, establece success como true
                - Si el texto está vacío, no es claro, o faltan detalles de tiempo, establece success como false y proporciona un mensaje de error
                - Siempre devuelve datos estructurados válidos que coincidan con el esquema
                - Al calcular fechas relativas como "mañana", usa la fecha actual como referencia
                
                Texto a analizar: "${text}"`;

            const structuredLLM = this.llm.withStructuredOutput(TimedEventSchema);
            const response = await structuredLLM.invoke(prompt);

            if (!response.success) {
                console.log('LLM indicated timed event parsing failure:', response.error);
                return null;
            }

            const parsedDetails = response.data;

            // Calculate endTime if hasDuration is true and endTime doesn't exist
            let calculatedEndTime = parsedDetails.endTime;
            if (parsedDetails.hasDuration && !parsedDetails.endTime) {
                const combinedDateTime = _combineDateAndTime(parsedDetails.startDate, parsedDetails.startTime, parsedDetails.duration);
                calculatedEndTime = combinedDateTime.split('T')[1].substring(0, 5);
            }

            // Create DomainEventDetails
            const eventDetails = new DomainEventDetails(
                parsedDetails.title,
                parsedDetails.startDate,
                false, // isAllDay = false for timed events
                parsedDetails.startTime,
                calculatedEndTime,
                parsedDetails.description,
                parsedDetails.startDate // endDate = same as startDate for single-day timed events
            );

            return new DomainEvent(
                null,
                "Add",
                eventDetails
            );
        } catch (error) {
            console.error('Error parsing timed event:', error);
            return null;
        }
    }

    /**
     * Parses an all-day event spanning full days
     * @param {string} text - The text to parse
     * @param {string} timezone - The timezone for date calculations
     * @returns {Promise<DomainEvent|null>} - Parsed event or null if failed
     */
    async _parseAllDayEvent(text, timezone) {
        try {
            // Get current date in the specified timezone
            const dateInfo = getCurrentDateInfo(timezone);
            const currentDate = dateInfo.currentDate;

            // Define the structured output schema for all-day events
            const AllDayEventSchema = z.object({
                success: z.boolean().describe("Si el texto contiene información válida de evento de todo el día"),
                data: z.object({
                    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Fecha de inicio del evento en formato YYYY-MM-DD"),
                    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Fecha de fin del evento en formato YYYY-MM-DD (por defecto es startDate para eventos de un día)"),
                    description: z.string().describe("Sé exhaustivo en la descripción. Incluye todos los detalles del evento proporcionado de manera pulida y clara."),
                    title: z.string().describe("Título del evento."),
                    isMultiDay: z.boolean().describe("Si este evento abarca múltiples días")
                }).optional().describe("Datos del evento (solo presente si success es true)"),
                error: z.string().optional().describe("Mensaje de error (solo presente si success es false)")
            });

            const timezoneInfo = timezone ? ` en zona horaria ${timezone}` : '';
            const prompt = `Analiza el siguiente texto para extraer detalles de evento de todo el día. Extrae fecha de inicio, fecha de fin, descripción y título.
                La fecha actual${timezoneInfo} es ${currentDate}. Usa esto como referencia para fechas relativas como "mañana" o "la próxima semana".
                
                ${DEFAULT_TITLE_DESCRIPTION_INSTRUCTIONS}
                
                REGLAS PARA MANEJAR EVENTOS DE TODO EL DÍA:
                1. Para eventos de un día (ej., "vacaciones mañana", "conferencia todo el día viernes"):
                   - Establece startDate = la fecha del evento
                   - Establece endDate = igual que startDate
                   - Establece isMultiDay = false
                
                2. Para eventos de múltiples días (ej., "me voy el proximo weekend", "estoy fuera todo el weekend que viene"):
                   - Establece startDate = primer día del evento
                   - Establece endDate = último día del evento
                   - Establece isMultiDay = true
                
                3. Para eventos con fechas relativas:
                   - "la próxima semana" = 7 días desde la fecha actual
                   - "este fin de semana" = viernes a domingo de la semana actual
                   - "el próximo mes" = primer día al último día del próximo mes
                
                EJEMPLOS:
                - "Me voy el proximo weekend" → (Asumiendo que hoy es martes, 2025-06-24) startDate="2025-06-27", endDate="2025-06-29", isMultiDay=true, title="Viaje", description="Viaje durante el fin de semana del 27-29 de junio"
                - "Estoy fuera el weekend de agosto 1" → startDate="2025-08-01", endDate="2025-08-03", isMultiDay=true, title="Viaje", description="Viaje durante el fin de semana del 1-3 de agosto"
                
                Reglas:
                - Si el texto contiene información válida de evento de todo el día, establece success como true
                - Si el texto está vacío, no es claro, o falta información de fecha, establece success como false y proporciona un mensaje de error
                - Siempre devuelve datos estructurados válidos que coincidan con el esquema
                - Al calcular fechas relativas, usa la fecha actual como referencia
                
                Texto a analizar: "${text}"`;

            const structuredLLM = this.llm.withStructuredOutput(AllDayEventSchema);
            const response = await structuredLLM.invoke(prompt);

            if (!response.success) {
                console.log('LLM indicated all-day event parsing failure:', response.error);
                return null;
            }

            const parsedDetails = response.data;

            // Create DomainEventDetails with all-day event structure
            // Note: This assumes DomainEventDetails has been updated to support all-day events
            const eventDetails = new DomainEventDetails(
                parsedDetails.title,
                parsedDetails.startDate,
                true, // isAllDay = true for all-day events
                null, // startTime is null for all-day events
                null, // endTime is null for all-day events
                parsedDetails.description,
                parsedDetails.endDate || parsedDetails.startDate // endDate for multi-day events
            );

            return new DomainEvent(
                null,
                "Add",
                eventDetails
            );
        } catch (error) {
            console.error('Error parsing all-day event:', error);
            return null;
        }
    }

    /**
     * Parses natural language text into a structured DomainEvent using LLM.
     * @param {string} text - The raw string to parse.
     * @param {string} timezone - Optional timezone for date calculations (e.g., 'America/Los_Angeles')
     * @returns {Promise<DomainEvent|null>} - A promise that resolves to a DomainEvent object or null if parsing fails.
     */
    async parseEventDetails(text, timezone) {  //TODO: Instead of returning null, we should return the error message somehow. -> By returning a DomainEventResult object.
        try {
            // Handle empty or invalid input early
            if (!text || typeof text !== 'string' || text.trim() === '') {
                return null;
            }

            // Get current date in the specified timezone or return error if no timezone provided
            if (!timezone) {
                console.log("❌ No timezone provided. Timezone is required for proper date calculations.");
                return null;
            }

            // Stage 1: Quick classification
            const eventType = await this._classifyEventType(text);

            // Stage 2: Specialized parsing with fallback
            try {
                if (eventType === 'timed') {
                    return await this._parseTimedEvent(text, timezone);
                } else if (eventType === 'allDay') {
                    return await this._parseAllDayEvent(text, timezone);
                } else {
                    // Stage 3: Fallback to unified parser (try timed first, then all-day)
                    const timedResult = await this._parseTimedEvent(text, timezone);
                    if (timedResult) {
                        return timedResult;
                    }

                    const allDayResult = await this._parseAllDayEvent(text, timezone);
                    if (allDayResult) {
                        return allDayResult;
                    }

                    return null;
                }
            } catch (error) {
                // Stage 4: Error recovery
                return null;
            }
        } catch (error) {
            console.error('Error parsing event details:', error);
            return null;
        }
    }

    /**
     * Parses natural language text into a structured DomainEventQuery using LLM.
     * @param {string} text - The raw string to parse.
     * @param {string} timezone - Optional timezone for date calculations (e.g., 'America/Los_Angeles')
     * @returns {Promise<DomainEvent|null>} - A promise that resolves to a DomainEvent object or null if parsing fails.
     */
    async parseEventQuery(text, timezone = null) {
        try {
            // Handle empty or invalid input early
            if (!text || typeof text !== 'string' || text.trim() === '') {
                return null;
            }

            // Get current date in the specified timezone or return error if no timezone provided
            let currentDate;
            let currentDayName;
            if (timezone) {
                try {
                    const dateInfo = getCurrentDateInfo(timezone);
                    currentDate = dateInfo.currentDate;
                    currentDayName = dateInfo.currentDayName;
                } catch (error) {
                    console.log("❌ Error getting timezone date info:", error.message);
                    return null;
                }
            } else {
                // Return null if no timezone provided (parsing failure)
                console.log("❌ No timezone provided. Timezone is required for proper date calculations.");
                return null;
            }

            // Define the structured output schema using Zod
            const QuerySchema = z.object({
                success: z.boolean().describe("Si el texto contiene información válida de consulta"),
                data: z.object({
                    timeMin: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/).describe("Hora de inicio para la consulta en formato ISO (YYYY-MM-DDTHH:MM:SS.sssZ)"),
                    timeMax: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/).describe("Hora de fin para la consulta en formato ISO (YYYY-MM-DDTHH:MM:SS.sssZ)"),
                    queryType: z.enum(['today', 'this_week', 'this_month', 'upcoming', 'weekend', 'custom']).describe("Tipo de consulta solicitada")
                }).optional().describe("Datos de consulta (solo presente si success es true)"),
                error: z.string().optional().describe("Mensaje de error (solo presente si success es false)")
            });

            const timezoneInfo = timezone ? ` en zona horaria ${timezone}` : '';
            const prompt = `Analiza el siguiente texto para extraer parámetros de consulta de calendario. Extrae el rango de tiempo para consultar eventos.
                La fecha actual${timezoneInfo} es ${currentDate} (${currentDayName}). Usa esto como referencia para fechas relativas como "hoy", "esta semana", "este fin de semana", etc.
                
                REGLAS PARA MANEJAR CONSULTAS:
                1. Para "hoy" o "eventos de hoy": Establece timeMin al inicio de hoy, timeMax al fin de hoy
                2. Para "este fin de semana" o "eventos del fin de semana": 
                   - Si hoy es viernes o antes: Establece timeMin al inicio de hoy, timeMax al fin de este domingo
                   - Si hoy es sábado: Establece timeMin al inicio de hoy, timeMax al fin de mañana (domingo)
                   - Si hoy es domingo: Establece timeMin al inicio de hoy, timeMax al fin de hoy
                   - Si hoy es lunes-jueves: Establece timeMin al inicio de este viernes, timeMax al fin de este domingo
                3. Para "esta semana" o "eventos de esta semana": Establece timeMin al inicio de la semana actual (lunes), timeMax al fin de la semana (domingo)
                4. Para "este mes" o "eventos de este mes": Establece timeMin al inicio del mes actual, timeMax al fin del mes
                5. Para "próximos" o "eventos futuros": Establece timeMin al inicio de hoy, timeMax a 6 meses desde hoy
                6. Para rangos de fechas específicos (ej., "15-20 de junio"): Establece timeMin y timeMax al rango especificado
                
                FORMATO DE TIEMPO:
                - Todos los tiempos deben estar en formato ISO: YYYY-MM-DDTHH:MM:SS.sssZ
                - Usa zona horaria UTC para consistencia
                - Para inicio del día: usa 00:00:00.000Z
                - Para fin del día: usa 23:59:59.999Z
                
                EJEMPLOS:
                - "muéstrame los eventos de hoy" → timeMin="2025-06-24T00:00:00.000Z", timeMax="2025-06-24T23:59:59.999Z", queryType="today"
                - "eventos este fin de semana" (si hoy es martes) → timeMin="2025-06-28T00:00:00.000Z", timeMax="2025-06-29T23:59:59.999Z", queryType="weekend"
                - "reuniones del fin de semana" (si hoy es sábado) → timeMin="2025-06-28T00:00:00.000Z", timeMax="2025-06-29T23:59:59.999Z", queryType="weekend"
                - "eventos esta semana" → timeMin="2025-06-22T00:00:00.000Z", timeMax="2025-06-28T23:59:59.999Z", queryType="this_week"
                - "reuniones próximas" → timeMin="2025-06-24T00:00:00.000Z", timeMax="2025-12-24T23:59:59.999Z", queryType="upcoming"
                
                Reglas:
                - Si el texto contiene información válida de consulta, establece success como true
                - Si el texto está vacío, no es claro, o no contiene información de consulta, establece success como false y proporciona un mensaje de error
                - Siempre devuelve datos estructurados válidos que coincidan con el esquema
                - Al calcular fechas relativas, usa la fecha y día actual como referencia
                
                Texto a analizar: "${text}"`;

            // Use structured output with LangChain
            const structuredLLM = this.llm.withStructuredOutput(QuerySchema);
            const response = await structuredLLM.invoke(prompt);

            // Check if the LLM indicated failure
            if (!response.success) {
                console.log('LLM indicated query parsing failure:', response.error);
                return null;
            }

            const parsedQuery = response.data;

            // Create DomainEventQuery
            const query = new DomainEventQuery({
                timeMin: parsedQuery.timeMin,
                timeMax: parsedQuery.timeMax
            });

            // Create and return DomainEvent
            return new DomainEvent(
                null, // ID is null as it's assigned by the calendar service
                "Fetch", // Describes type of event (add, update, delete, fetch) //TODO: Add enum control for this.
                query
            );
        } catch (error) {
            console.error('Error parsing event query:', error);
            return null;
        }
    }
}

module.exports = EventParserInfrastructure;