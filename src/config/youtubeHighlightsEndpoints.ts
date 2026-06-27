export const GOOGLE_API31_HOST = "google-api31.p.rapidapi.com";
export const YOUTUBE_V2_HOST = "youtube-v2.p.rapidapi.com";
export const YOUTUBE138_HOST = "youtube138.p.rapidapi.com";
export const WEBSITE_SOCIAL_SCRAPER_HOST = "website-social-scraper-api.p.rapidapi.com";

export const FOX_SOCCER_CHANNEL_ID = "UCooTLkxcpnTNx6vfOovfBFA";
export const TELEMUNDO_DEPORTES_CHANNEL_ID = "UCjZ7QPKb89R-4SxzBoceyOg";

export type OfficialYouTubeChannel = {
  id: string;
  label: string;
  provider: "fox" | "telemundo";
  website: string;
};

export const OFFICIAL_MATCH_VIDEO_CHANNELS: OfficialYouTubeChannel[] = [
  {
    id: FOX_SOCCER_CHANNEL_ID,
    label: "FOX Soccer",
    provider: "fox",
    website: "https://www.foxsports.com/soccer",
  },
  {
    id: TELEMUNDO_DEPORTES_CHANNEL_ID,
    label: "Telemundo Deportes",
    provider: "telemundo",
    website: "https://www.telemundodeportes.com",
  },
];

export const googleApi31Endpoints = {
  root: () => "/",
  webSearch: () => "/websearch",
  videoSearch: () => "/videosearch",
  imageSearch: () => "/imagesearch",
} as const;

export const youtube138Endpoints = {
  channelVideos: () => "/channel/videos/",
} as const;

export const youtubeV2Endpoints = {
  videoScreenshot: (videoId: string, timestampSeconds = 1200) =>
    `/video/screenshot?video_id=${encodeURIComponent(videoId)}&timestamp_s=${encodeURIComponent(
      String(timestampSeconds)
    )}`,
} as const;

export const websiteSocialScraperEndpoints = {
  contacts: (website: string) => `/contacts?website=${encodeURIComponent(website)}`,
} as const;

