/** Fecha interna en formato ISO (`YYYY-MM-DD`). */
export type FechaISO = `${number}-${number}-${number}`

/** Período de trabajo de la demo. */
export interface Periodo {
  desde: FechaISO
  hasta: FechaISO
  etiqueta: string
}
