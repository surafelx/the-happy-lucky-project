export type PinKind =
  | "backpack"
  | "laptop"
  | "library"
  | "camera"
  | "music"
  | "heart"
  | "palette"
  | "teacup"
  | "sun"
  | "spark"
  | "school"
  | "flower";

export type DonationTarget =
  | { type: "campaign"; campaignId: string }
  | { type: "general" };