export async function assertReferenceImagesAllowed(_urls: string[]) {
  if (process.env.ENABLE_IMAGE_MODERATION !== 'true') return
  // The standalone SeeAPI adapter will live here. Fail closed when the feature is enabled
  // but no adapter has been configured, so images are never silently submitted unreviewed.
  throw new Error('IMAGE_MODERATION_NOT_CONFIGURED')
}
