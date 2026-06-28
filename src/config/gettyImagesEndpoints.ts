/** Getty Images API (raygorodskij V1) on RapidAPI. */
export const GETTY_IMAGES_HOST = "gettyimagesraygorodskijv1.p.rapidapi.com";

/** RapidAPI host header (mixed case per marketplace). */
export const GETTY_IMAGES_RAPIDAPI_HOST_HEADER = "GettyImagesraygorodskijV1.p.rapidapi.com";

export const GETTY_IMAGE_ENDPOINTS = [
  "getAccessToken",
  "getResourceOwnerGrant",
  "refreshToken",
  "getEventsBySearchQuery",
  "getImagesBySearchQuery",
  "getCreativeImagesBySearchQuery",
  "getEditorialImagesBySearchQuery",
  "getVideoBySearchQuery",
  "getCreativeVideoBySearchQuery",
  "getEditorialVideoBySearchQuery",
  "getImages",
  "getImage",
  "getSimilarImage",
  "getVideos",
  "getVideo",
  "getPreviousDownloadsInfo",
  "downloadImage",
  "downloadVideo",
  "getBoards",
  "createBoard",
  "updateBoard",
  "getBoard",
  "deleteBoard",
  "addAssetToBoard",
  "deleteAssetFromBoard",
  "getCollection",
  "getCountriesList",
  "getEvents",
  "getEvent",
  "getProducts",
  "getPreviouslyPurchasedAssets",
  "GetPreviousPurchases",
  "registerAssets",
  "getImagesByArtistName",
  "getVideosByArtistName",
] as const;

export type GettyImageEndpointName = (typeof GETTY_IMAGE_ENDPOINTS)[number];

const ALLOWED = new Set<string>(GETTY_IMAGE_ENDPOINTS);

export function isGettyImagesPathAllowed(path: string): boolean {
  const segment = path.replace(/^\//, "").split("/")[0] ?? "";
  return ALLOWED.has(segment);
}

export const gettyImagesEndpoints = {
  getAccessToken: () => "/getAccessToken",
  getResourceOwnerGrant: () => "/getResourceOwnerGrant",
  refreshToken: () => "/refreshToken",
  getEventsBySearchQuery: () => "/getEventsBySearchQuery",
  getImagesBySearchQuery: () => "/getImagesBySearchQuery",
  getCreativeImagesBySearchQuery: () => "/getCreativeImagesBySearchQuery",
  getEditorialImagesBySearchQuery: () => "/getEditorialImagesBySearchQuery",
  getVideoBySearchQuery: () => "/getVideoBySearchQuery",
  getCreativeVideoBySearchQuery: () => "/getCreativeVideoBySearchQuery",
  getEditorialVideoBySearchQuery: () => "/getEditorialVideoBySearchQuery",
  getImages: () => "/getImages",
  getImage: () => "/getImage",
  getSimilarImage: () => "/getSimilarImage",
  getVideos: () => "/getVideos",
  getVideo: () => "/getVideo",
  getPreviousDownloadsInfo: () => "/getPreviousDownloadsInfo",
  downloadImage: () => "/downloadImage",
  downloadVideo: () => "/downloadVideo",
  getBoards: () => "/getBoards",
  createBoard: () => "/createBoard",
  updateBoard: () => "/updateBoard",
  getBoard: () => "/getBoard",
  deleteBoard: () => "/deleteBoard",
  addAssetToBoard: () => "/addAssetToBoard",
  deleteAssetFromBoard: () => "/deleteAssetFromBoard",
  getCollection: () => "/getCollection",
  getCountriesList: () => "/getCountriesList",
  getEvents: () => "/getEvents",
  getEvent: () => "/getEvent",
  getProducts: () => "/getProducts",
  getPreviouslyPurchasedAssets: () => "/getPreviouslyPurchasedAssets",
  getPreviousPurchases: () => "/GetPreviousPurchases",
  registerAssets: () => "/registerAssets",
  getImagesByArtistName: () => "/getImagesByArtistName",
  getVideosByArtistName: () => "/getVideosByArtistName",
} as const;
