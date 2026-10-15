type NamedService = { id: string; name: string };

function cleanName(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

export function extraIdsFromNotes(notes: string | undefined, services: NamedService[], mainId: string) {
  const line = notes?.split("\n").find((item) => item.startsWith("extras:"));
  if (line) {
    return line
      .slice("extras:".length)
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id && id !== mainId && services.some((service) => service.id === id));
  }
  const soins = notes?.split("\n").find((item) => item.startsWith("Soins:"));
  if (!soins) return [];
  const mainName = cleanName(services.find((service) => service.id === mainId)?.name ?? "");
  const seen = new Set<string>();
  return soins
    .slice("Soins:".length)
    .split("+")
    .map((name) => name.trim())
    .filter((name) => name && cleanName(name) !== mainName)
    .map((name) => services.find((service) => cleanName(service.name) === cleanName(name))?.id)
    .filter((id): id is string => {
      if (!id || id === mainId || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
}

export function soinLabelsFromNotes(notes: string | undefined) {
  const soins = notes?.split("\n").find((item) => item.startsWith("Soins:"));
  if (!soins) return [];
  return soins
    .slice("Soins:".length)
    .split("+")
    .map((name) => name.trim())
    .filter(Boolean);
}

export function notesWithServices(
  notes: string | undefined,
  services: NamedService[],
  mainId: string,
  extraIds: string[],
  extraLabels: string[] = [],
) {
  const kept = (notes ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("Soins:") && !line.startsWith("extras:") && !line.startsWith("Promo:"));
  const labels = [mainId, ...extraIds]
    .map((id) => services.find((service) => service.id === id)?.name)
    .filter((name): name is string => Boolean(name));
  const allLabels = [...labels, ...extraLabels.filter((name) => !labels.some((label) => cleanName(label) === cleanName(name)))];
  if (extraIds.length === 0 && allLabels.length <= 1) return kept.join("\n");
  const lines = [
    extraIds.length > 0 ? `extras:${extraIds.join(",")}` : "",
    allLabels.length > 0 ? `Soins: ${allLabels.join(" + ")}` : "",
  ].filter(Boolean);
  return [...lines, ...kept].join("\n");
}
