/** Posed RenderPeople scans — natural standing poses (no rigged T/A-pose arms). */
export const POSED_CROWD_ASSETS = [
  "rp_dennis_posed_004_30k",
  "rp_fabienne_percy_posed_001_60k",
  "rp_mei_posed_001_30k",
  "rp_posed_00178_29",
] as const;

/** One posed asset per crowd slot (layouts 1–14). */
export const CROWD_SLOT_ASSETS: readonly string[] = [
  "rp_fabienne_percy_posed_001_60k", // inner left
  "rp_dennis_posed_004_30k", // inner right
  "rp_mei_posed_001_30k",
  "rp_posed_00178_29",
  "rp_dennis_posed_004_30k",
  "rp_fabienne_percy_posed_001_60k",
  "rp_posed_00178_29",
  "rp_mei_posed_001_30k",
  "rp_fabienne_percy_posed_001_60k",
  "rp_dennis_posed_004_30k",
  "rp_mei_posed_001_30k",
  "rp_posed_00178_29",
  "rp_dennis_posed_004_30k",
  "rp_fabienne_percy_posed_001_60k",
];
