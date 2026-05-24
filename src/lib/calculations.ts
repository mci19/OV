import type { DoorConfig, DoorGeometry, ValidationIssue } from './types'

export function computeGeometry(config: DoorConfig): DoorGeometry {
  const { hoogte, breedte, verticaleLijnVanafLinks } = config

  const bladeVertical = hoogte - 30
  const bladeHorizontal = breedte - 88

  const glassKaderVertGelaste = bladeVertical - 40
  const glassKaderHorizGelaste = bladeHorizontal - 30
  const glassKaderVertPoederlak = bladeVertical - 42
  const glassKaderHorizPoederlak = bladeHorizontal - 32

  const designVertGelaste = glassKaderVertGelaste - 30
  const designVertPoederlak = glassKaderVertGelaste - 32

  const crossbarLeftGelaste = verticaleLijnVanafLinks + 1
  const crossbarLeftPoederlak = verticaleLijnVanafLinks
  const crossbarRightGelaste = glassKaderHorizGelaste - crossbarLeftGelaste - 15
  const crossbarRightPoederlak = glassKaderHorizPoederlak - crossbarLeftPoederlak - 15

  const glassWidth = bladeHorizontal - 8
  const glassHeight = bladeVertical - 48

  return {
    outerVerticalLength: hoogte,
    outerHorizontalLength: breedte - 40,
    bladeVertical,
    bladeHorizontal,
    glassKaderVertGelaste,
    glassKaderHorizGelaste,
    glassKaderVertPoederlak,
    glassKaderHorizPoederlak,
    designVertGelaste,
    designVertPoederlak,
    crossbarLeftGelaste,
    crossbarLeftPoederlak,
    crossbarRightGelaste,
    crossbarRightPoederlak,
    glassWidth,
    glassHeight,
    juostaVertical: hoogte,
    juostaHorizontal: breedte - 70,
    kampasLength: 700,
    kampasCount: 2,
  }
}

export function validateConfig(config: DoorConfig): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const { hoogte, breedte, designEnabled, verticaleLijnVanafLinks, horizontaleDwarslatVanafOnder } = config

  if (!Number.isFinite(hoogte) || hoogte < 1800)
    issues.push({ field: 'hoogte', message: 'Hoogte moet ten minste 1800 mm zijn', severity: 'error' })
  if (hoogte > 3500)
    issues.push({ field: 'hoogte', message: 'Hoogte mag maximaal 3500 mm zijn', severity: 'error' })
  if (!Number.isFinite(breedte) || breedte < 600)
    issues.push({ field: 'breedte', message: 'Breedte moet ten minste 600 mm zijn', severity: 'error' })
  if (breedte > 1500)
    issues.push({ field: 'breedte', message: 'Breedte mag maximaal 1500 mm zijn', severity: 'error' })

  if (issues.some((i) => i.severity === 'error')) return issues

  const geo = computeGeometry(config)
  if (geo.bladeHorizontal <= 100)
    issues.push({
      field: 'breedte',
      message: 'Deurbladbreedte wordt te klein door speling-aftrek',
      severity: 'error',
    })

  if (designEnabled) {
    if (verticaleLijnVanafLinks < 50)
      issues.push({
        field: 'verticaleLijnVanafLinks',
        message: 'Verticale lijn moet ten minste 50 mm van de linker rand liggen',
        severity: 'error',
      })
    if (verticaleLijnVanafLinks > geo.glassKaderHorizPoederlak - 50)
      issues.push({
        field: 'verticaleLijnVanafLinks',
        message: `Verticale lijn moet binnen het kader vallen (max ${geo.glassKaderHorizPoederlak - 50} mm)`,
        severity: 'error',
      })

    if (horizontaleDwarslatVanafOnder < 100)
      issues.push({
        field: 'horizontaleDwarslatVanafOnder',
        message: 'Dwarslat moet ten minste 100 mm van de onderrand liggen',
        severity: 'warning',
      })
    if (horizontaleDwarslatVanafOnder > geo.glassKaderVertPoederlak - 100)
      issues.push({
        field: 'horizontaleDwarslatVanafOnder',
        message: `Dwarslat moet binnen het kader vallen (max ${geo.glassKaderVertPoederlak - 100} mm)`,
        severity: 'error',
      })

    if (geo.crossbarRightGelaste < 50 || geo.crossbarRightPoederlak < 50)
      issues.push({
        field: 'verticaleLijnVanafLinks',
        message: 'Rechtersegment van dwarslat wordt kleiner dan 50 mm',
        severity: 'warning',
      })
  }

  return issues
}

export function ralLabel(config: DoorConfig): string {
  if (config.colorKind === 'ral_9005') return 'RAL 9005'
  if (config.colorKind === 'ral_9010') return 'RAL 9010'
  return config.colorOther.trim() || 'RAL ?'
}

export function glassLabel(config: DoorConfig): string {
  switch (config.glassType) {
    case 'clear':
      return 'Clear glass'
    case 'matt':
      return 'Matt glass'
    case 'cathedraal_flute':
      return 'Cathedraal-Flute'
    case 'other':
      return config.glassOther.trim() || 'Other glass'
  }
}
