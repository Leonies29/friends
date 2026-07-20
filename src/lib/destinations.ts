export type DestinationId = "istanbul";

export interface Destination {
  id: DestinationId;
  name: string;
  country: string;
  tagline?: string;
}

export const DESTINATIONS: Record<DestinationId, Destination> = {
  istanbul: {
    id: "istanbul",
    name: "Istanbul",
    country: "Turkey",
    tagline: "7 Days. 1 City. Endless Memories."
  }
};

export const DESTINATION_LIST: Destination[] = Object.values(DESTINATIONS);

export const DEFAULT_DESTINATION_ID: DestinationId = "istanbul";

export function pickForDestination<T>(map: Record<DestinationId, T[]>, id: DestinationId | undefined): T[] {
  return map[id ?? DEFAULT_DESTINATION_ID] ?? map[DEFAULT_DESTINATION_ID];
}
