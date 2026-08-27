export type ImageFit = 'cover' | 'contain'
export type ImageScale = 'full' | 'half' | 'third' | 'thumb'
export type ImagePreset = 'hero' | 'inline'
export type ImageDeliveryFormat = 'webp' | 'avif' | 'jpeg' | 'png' | 'gif'
export type ImageDeliveryCropKind = 'mobile' | 'tablet' | 'desktop'
export type ImageDeliveryPreset = 'thumbnail' | 'card' | 'detail' | 'content' | 'hero' | 'visual-wall'

export type ImageCropRect = {
  x: number
  y: number
  width: number
  height: number
}

export type ImageCropSet = Partial<Record<ImageDeliveryCropKind, ImageCropRect>>

export type ImageDeliveryModifiers = {
  width?: unknown
  height?: unknown
  fit?: unknown
  format?: unknown
  quality?: unknown
  crop?: unknown
  crops?: unknown
  maxWidth?: unknown
}

export type AwsImageRequest = {
  bucket: string
  key: string
  outputFormat: ImageDeliveryFormat
  edits: {
    crop?: { left: number; top: number; width: number; height: number }
    resize: { width: number; height?: number; fit: ImageFit }
    toFormat: ImageDeliveryFormat
    png?: { quality: number }
    jpeg?: { quality: number }
    webp?: { quality: number }
    avif?: { quality: number }
  }
}

export type ImageDeliveryProfile = {
  label: string
  description: string
  fit: ImageFit
  format: ImageDeliveryFormat
  quality: number
  sizes: Record<ImageDeliveryCropKind, string>
  widths: Record<ImageDeliveryCropKind, readonly number[]>
}

export type ArtDirectedSource = {
  kind: ImageDeliveryCropKind
  media: string
  sizes: string
  widths: number[]
  crop: ImageCropRect
  srcset: string
}

export type ResponsiveImageAttrs = {
  src: string
  srcset: string
  sizes: string
  fit: ImageFit
  format: ImageDeliveryFormat
  quality: number
  preset: ImageDeliveryPreset
}

export const IMAGE_DELIVERY_WIDTHS = [
  64, 128, 160, 256, 320, 384, 480, 512, 640, 768, 960, 1024, 1280, 1366, 1600, 1920, 2560,
] as const

export const IMAGE_DELIVERY_QUALITIES = [50, 70, 82, 90] as const
export const DEFAULT_IMAGE_WIDTH = 1280
export const DEFAULT_IMAGE_QUALITY = 82
export const MAX_IMAGE_WIDTH = 1920
export const MAX_VISUAL_WALL_WIDTH = 2560

export const IMAGE_DELIVERY_PROFILES: Record<ImageDeliveryPreset, ImageDeliveryProfile> = {
  thumbnail: {
    label: 'Thumbnail',
    description: 'Compact list, avatar, and media-picker imagery.',
    fit: 'contain',
    format: 'webp',
    quality: 82,
    sizes: { mobile: '160px', tablet: '160px', desktop: '160px' },
    widths: { mobile: [160, 320], tablet: [160, 320], desktop: [160, 320] },
  },
  card: {
    label: 'Card',
    description: 'Responsive cards and index-grid media.',
    fit: 'cover',
    format: 'webp',
    quality: 82,
    sizes: { mobile: '100vw', tablet: '50vw', desktop: '33vw' },
    widths: { mobile: [384, 768], tablet: [512, 1024], desktop: [640, 1280] },
  },
  detail: {
    label: 'Detail',
    description: 'Large media detail and editor preview surfaces.',
    fit: 'cover',
    format: 'webp',
    quality: 82,
    sizes: { mobile: '100vw', tablet: '75vw', desktop: '66vw' },
    widths: { mobile: [384, 768], tablet: [640, 1024], desktop: [768, 1366] },
  },
  content: {
    label: 'Content',
    description: 'Inline story and editorial content imagery.',
    fit: 'contain',
    format: 'webp',
    quality: 82,
    sizes: { mobile: '100vw', tablet: '75vw', desktop: '66vw' },
    widths: { mobile: [480, 768], tablet: [768, 1024], desktop: [1024, 1366] },
  },
  hero: {
    label: 'Hero',
    description: 'Full-width story and campaign hero imagery.',
    fit: 'cover',
    format: 'webp',
    quality: 82,
    sizes: { mobile: '100vw', tablet: '100vw', desktop: '100vw' },
    widths: { mobile: [640, 960], tablet: [960, 1280], desktop: [1280, 1600, 1920] },
  },
  'visual-wall': {
    label: 'Visual wall',
    description: 'Full-bleed story imagery that must remain sharp on high-density displays.',
    fit: 'cover',
    format: 'webp',
    quality: 90,
    sizes: { mobile: '100vw', tablet: '100vw', desktop: '100vw' },
    widths: { mobile: [640, 960], tablet: [960, 1280], desktop: [1280, 1600, 1920, 2560] },
  },
}

const CROP_MEDIA: Record<ImageDeliveryCropKind, string> = {
  mobile: '(max-width: 639px)',
  tablet: '(min-width: 640px) and (max-width: 1023px)',
  desktop: '(min-width: 1024px)',
}

function finiteNumber(value: unknown): number | undefined {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function nearestAllowed(value: number, allowed: readonly number[]): number {
  return allowed.reduce((nearest, candidate) =>
    Math.abs(candidate - value) < Math.abs(nearest - value) ? candidate : nearest,
  allowed[0]!)
}

function imageWidthCap(value: unknown): number {
  const parsed = finiteNumber(value)
  const requested = parsed && parsed > 0 ? parsed : MAX_IMAGE_WIDTH
  const bounded = Math.min(requested, MAX_VISUAL_WALL_WIDTH)
  return [...IMAGE_DELIVERY_WIDTHS].reverse().find(width => width <= bounded) ?? IMAGE_DELIVERY_WIDTHS[0]
}

export function snapImageWidth(value: unknown, fallback = DEFAULT_IMAGE_WIDTH, maxWidth = MAX_IMAGE_WIDTH): number {
  const parsed = finiteNumber(value)
  const requested = parsed && parsed > 0 ? parsed : fallback
  const bounded = Math.min(requested, imageWidthCap(maxWidth))
  return IMAGE_DELIVERY_WIDTHS.find(width => width >= bounded) ?? imageWidthCap(maxWidth)
}

export function snapImageQuality(value: unknown, fallback = DEFAULT_IMAGE_QUALITY): number {
  const parsed = finiteNumber(value)
  const requested = parsed === undefined ? fallback : Math.min(100, Math.max(1, parsed))
  return nearestAllowed(requested, IMAGE_DELIVERY_QUALITIES)
}

export function normalizeImageFormat(value: unknown): ImageDeliveryFormat {
  const format = String(value || 'webp').trim().toLowerCase()
  if (format === 'jpg') return 'jpeg'
  if (format === 'webp' || format === 'avif' || format === 'jpeg' || format === 'png' || format === 'gif') return format
  return 'webp'
}

export function normalizeImageFit(value: unknown): ImageFit {
  return value === 'contain' ? 'contain' : 'cover'
}

export function normalizeCropRect(value: unknown): ImageCropRect | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const record = value as Record<string, unknown>
  const x = finiteNumber(record.x ?? record.left)
  const y = finiteNumber(record.y ?? record.top)
  const width = finiteNumber(record.width)
  const height = finiteNumber(record.height)
  if (x === undefined || y === undefined || width === undefined || height === undefined) return undefined
  if (x < 0 || y < 0 || width <= 0 || height <= 0) return undefined
  return { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) }
}

export function normalizeCropSet(value: unknown): ImageCropSet | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const record = value as Record<string, unknown>
  const crop: ImageCropSet = {}
  for (const kind of ['mobile', 'tablet', 'desktop'] as const) {
    const rect = normalizeCropRect(record[kind])
    if (rect) crop[kind] = rect
  }
  return Object.keys(crop).length > 0 ? crop : undefined
}

export function selectResponsiveCrop(crops: ImageCropSet | undefined, kind: ImageDeliveryCropKind): ImageCropRect | undefined {
  if (!crops) return undefined
  const fallbackOrder: Record<ImageDeliveryCropKind, ImageDeliveryCropKind[]> = {
    mobile: ['mobile', 'tablet', 'desktop'],
    tablet: ['tablet', 'desktop', 'mobile'],
    desktop: ['desktop', 'tablet', 'mobile'],
  }
  for (const candidate of fallbackOrder[kind]) {
    const crop = normalizeCropRect(crops[candidate])
    if (crop) return crop
  }
  return undefined
}

export function legacyCropKindForWidth(value: unknown): ImageDeliveryCropKind {
  const width = finiteNumber(value) ?? DEFAULT_IMAGE_WIDTH
  if (width <= 480) return 'mobile'
  if (width <= 768) return 'tablet'
  return 'desktop'
}

export function canonicalizeImageWidths(values: Iterable<unknown>, maxWidth = MAX_IMAGE_WIDTH): number[] {
  return [...new Set([...values].map(value => snapImageWidth(value, DEFAULT_IMAGE_WIDTH, maxWidth)))]
    .sort((left, right) => left - right)
}

export function imageDeliveryPresetFor(scale: ImageScale | undefined, preset: ImagePreset = 'inline'): ImageDeliveryPreset {
  if (scale === 'full') return 'visual-wall'
  if (preset === 'hero') return 'hero'
  if (scale === 'thumb') return 'thumbnail'
  if (scale === 'third') return 'card'
  if (scale === 'half') return 'detail'
  return 'content'
}

export function imageDeliveryProfile(preset: ImageDeliveryPreset): ImageDeliveryProfile {
  return IMAGE_DELIVERY_PROFILES[preset]
}

export function imageDeliveryMaxWidth(preset: ImageDeliveryPreset): number {
  return preset === 'visual-wall' ? MAX_VISUAL_WALL_WIDTH : Math.max(...IMAGE_DELIVERY_PROFILES[preset].widths.desktop)
}

export function imageDeliveryCandidateWidths(preset: ImageDeliveryPreset): number[] {
  const profile = imageDeliveryProfile(preset)
  return canonicalizeImageWidths(
    [...profile.widths.mobile, ...profile.widths.tablet, ...profile.widths.desktop],
    imageDeliveryMaxWidth(preset),
  )
}

export function buildAwsImageRequest(bucket: string, key: string, modifiers: ImageDeliveryModifiers = {}): AwsImageRequest {
  const normalizedBucket = String(bucket || '').trim()
  const normalizedKey = String(key || '').trim().replace(/^\/+/, '')
  if (!normalizedBucket) throw new Error('An image source bucket is required.')
  if (!normalizedKey) throw new Error('An image source key is required.')

  const requestedWidth = finiteNumber(modifiers.width) ?? DEFAULT_IMAGE_WIDTH
  const maxWidth = imageWidthCap(modifiers.maxWidth)
  const width = snapImageWidth(requestedWidth, DEFAULT_IMAGE_WIDTH, maxWidth)
  const requestedHeight = finiteNumber(modifiers.height)
  const quality = snapImageQuality(modifiers.quality)
  const format = normalizeImageFormat(modifiers.format)
  const fit = normalizeImageFit(modifiers.fit)
  const crop = normalizeCropRect(modifiers.crop)
    ?? selectResponsiveCrop(normalizeCropSet(modifiers.crops), legacyCropKindForWidth(requestedWidth))

  const edits: AwsImageRequest['edits'] = {
    ...(crop ? { crop: { left: crop.x, top: crop.y, width: crop.width, height: crop.height } } : {}),
    resize: { width, fit },
    toFormat: format,
  }
  if (requestedHeight && requestedHeight > 0) edits.resize.height = snapImageWidth(requestedHeight, DEFAULT_IMAGE_WIDTH, maxWidth)
  if (format === 'png' || format === 'jpeg' || format === 'webp' || format === 'avif') edits[format] = { quality }

  return { bucket: normalizedBucket, key: normalizedKey, outputFormat: format, edits }
}

function toBase64(value: string): string {
  if (typeof Buffer !== 'undefined') return Buffer.from(value).toString('base64')
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function fromBase64(value: string): string {
  if (typeof Buffer !== 'undefined') return Buffer.from(value, 'base64').toString('utf8')
  const binary = atob(value)
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function buildAwsImageUrl(input: { baseURL: string; bucket: string; key: string; modifiers?: ImageDeliveryModifiers }): string {
  const baseURL = String(input.baseURL || '').trim().replace(/\/+$/, '')
  if (!baseURL) throw new Error('An image delivery base URL is required.')
  return `${baseURL}/${toBase64(JSON.stringify(buildAwsImageRequest(input.bucket, input.key, input.modifiers)))}`
}

export function decodeAwsImageUrl(url: string): AwsImageRequest {
  const encoded = new URL(url).pathname.split('/').filter(Boolean).at(-1)
  if (!encoded) throw new Error('The image URL does not contain an encoded request.')
  return JSON.parse(fromBase64(decodeURIComponent(encoded))) as AwsImageRequest
}

export function buildImageSrcset(widths: Iterable<unknown>, urlFor: (width: number) => string, maxWidth = MAX_IMAGE_WIDTH): string {
  return canonicalizeImageWidths(widths, maxWidth).map(width => `${urlFor(width)} ${width}w`).join(', ')
}

export function buildResponsiveImageAttrs(input: {
  preset: ImageDeliveryPreset
  fit?: ImageFit
  format?: ImageDeliveryFormat
  quality?: number
  urlFor: (width: number, options: { fit: ImageFit; format: ImageDeliveryFormat; quality: number; maxWidth: number }) => string
}): ResponsiveImageAttrs {
  const profile = imageDeliveryProfile(input.preset)
  const fit = input.fit ?? profile.fit
  const format = normalizeImageFormat(input.format ?? profile.format)
  const quality = snapImageQuality(input.quality, profile.quality)
  const maxWidth = imageDeliveryMaxWidth(input.preset)
  const widths = imageDeliveryCandidateWidths(input.preset)
  const urlFor = (width: number) => input.urlFor(width, { fit, format, quality, maxWidth })
  return {
    src: urlFor(widths.at(-1)!),
    srcset: buildImageSrcset(widths, urlFor, maxWidth),
    sizes: profile.sizes.desktop,
    fit,
    format,
    quality,
    preset: input.preset,
  }
}

export function buildArtDirectedSources(input: {
  crops: ImageCropSet
  preset: ImageDeliveryPreset
  urlFor: (width: number, crop: ImageCropRect, kind: ImageDeliveryCropKind) => string
}): ArtDirectedSource[] {
  const profile = imageDeliveryProfile(input.preset)
  const maxWidth = imageDeliveryMaxWidth(input.preset)
  return (['mobile', 'tablet', 'desktop'] as const)
    .map((kind): ArtDirectedSource | null => {
      const crop = selectResponsiveCrop(input.crops, kind)
      if (!crop) return null
      const widths = canonicalizeImageWidths(profile.widths[kind], maxWidth)
      return {
        kind,
        media: CROP_MEDIA[kind],
        sizes: profile.sizes[kind],
        widths,
        crop,
        srcset: buildImageSrcset(widths, width => input.urlFor(width, crop, kind), maxWidth),
      }
    })
    .filter((source): source is ArtDirectedSource => source !== null)
}
