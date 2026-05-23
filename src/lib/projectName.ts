export function generateProjectName(properties: any) {
  const il = properties?.Il || ""
  const ilce = properties?.Ilce || ""
  const mahalle = properties?.Mahalle || ""
  const ada = properties?.Ada || ""
  const parsel = properties?.ParselNo || ""

  return `${il} ${ilce} ${mahalle} ${ada} Ada ${parsel} Parsel`
    .replace(/\s+/g, " ")
    .trim()
}

export function generateShortProjectName(properties: any) {
  const mahalle = properties?.Mahalle || ""
  const ada = properties?.Ada || ""
  const parsel = properties?.ParselNo || ""

  return `${mahalle} ${ada}/${parsel} Parsel`
    .replace(/\s+/g, " ")
    .trim()
}
