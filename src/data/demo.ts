import { RecordItem } from '../types';

export const THEMES = [
  "Case detection",
  "Health system strengthening",
  "Community engagement",
  "Research and laboratory",
  "Policy and governance",
  "Civil society capacity"
];

export const LEVELS = ["Community", "District", "Subnational", "National", "Regional"];

export const DISEASES = ["Buruli ulcer", "Leprosy", "Yaws", "Lymphatic filariasis", "Multiple skin NTDs"];

export const COUNTRIES = [
  "Benin",
  "Ghana",
  "Togo",
  "Cote d'Ivoire",
  "Senegal",
  "Liberia"
];

export const DEMO_RECORDS: RecordItem[] = [
  {
    id: "demo-benin",
    partner: "Benin Ministry of Health",
    theme: "Case detection",
    country: "Benin",
    region: "Zou and Atlantique",
    level: "District",
    disease: "Buruli ulcer",
    evidence: "Health workers trained on early detection and referral pathways updated across two departments.",
    reached: 3450,
    confidence: "High",
    source: "Partner quarterly report",
    updatedAt: "2026-06-19T12:00:00Z",
    updatedBy: "demo-system"
  },
  {
    id: "demo-ghana",
    partner: "Ghana Health Service",
    theme: "Policy and governance",
    country: "Ghana",
    region: "National",
    level: "National",
    disease: "Multiple skin NTDs",
    evidence: "Skin NTD indicators incorporated into the national neglected tropical disease review process.",
    reached: 0,
    confidence: "Medium",
    source: "Workshop minutes",
    updatedAt: "2026-06-19T12:00:00Z",
    updatedBy: "demo-system"
  },
  {
    id: "demo-togo",
    partner: "Togo civil society coalition",
    theme: "Civil society capacity",
    country: "Togo",
    region: "Maritime",
    level: "Subnational",
    disease: "Leprosy",
    evidence: "Community organisations adopted a shared results template and began monthly referral reporting.",
    reached: 980,
    confidence: "Medium",
    source: "Excel tracker",
    updatedAt: "2026-06-19T12:00:00Z",
    updatedBy: "demo-system"
  },
  {
    id: "demo-cote-divoire",
    partner: "Cote d'Ivoire research lab",
    theme: "Research and laboratory",
    country: "Cote d'Ivoire",
    region: "Abidjan",
    level: "National",
    disease: "Yaws",
    evidence: "Laboratory protocol harmonised for sample handling, reducing incomplete diagnostic forms.",
    reached: 0,
    confidence: "High",
    source: "Technical report",
    updatedAt: "2026-06-19T12:00:00Z",
    updatedBy: "demo-system"
  },
  {
    id: "demo-senegal",
    partner: "Senegal district health teams",
    theme: "Community engagement",
    country: "Senegal",
    region: "Kedougou",
    level: "Community",
    disease: "Multiple skin NTDs",
    evidence: "Peer educators held stigma reduction sessions and increased acceptance of referral visits.",
    reached: 2120,
    confidence: "High",
    source: "Field narrative",
    updatedAt: "2026-06-19T12:00:00Z",
    updatedBy: "demo-system"
  },
  {
    id: "demo-liberia",
    partner: "Liberia county health office",
    theme: "Health system strengthening",
    country: "Liberia",
    region: "Bong County",
    level: "Subnational",
    disease: "Lymphatic filariasis",
    evidence: "County teams started using a single reporting form for morbidity management follow-up.",
    reached: 760,
    confidence: "Low",
    source: "Word report",
    updatedAt: "2026-06-19T12:00:00Z",
    updatedBy: "demo-system"
  }
];
