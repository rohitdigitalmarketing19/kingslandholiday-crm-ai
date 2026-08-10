/**
 * Gemini AI Service — Frontend Proxy
 * 
 * All AI calls now go through the backend API to keep the Gemini API key secure.
 * This file provides the same function signatures that the frontend components expect,
 * but internally routes everything through /api/ai/* endpoints.
 */

import { Lead, Itinerary } from '../types';
import { analyzeLeadAI, generateItineraryAI, draftFollowUpEmailAI } from './apiService';

export const analyzeLeadInquiry = async (data: {
  name: string;
  destination: string;
  duration: number;
  date: string;
  travelers: any;
  otherInfo: string;
}): Promise<Partial<Lead>> => {
  return analyzeLeadAI(data);
};

export const generateItinerary = async (lead: Lead): Promise<Itinerary> => {
  const data = await generateItineraryAI({
    name: lead.name,
    destination: lead.destination,
    durationDays: lead.durationDays || 7,
    travelDate: lead.travelDate || '',
    adults: lead.travelers?.adults || 2,
    children: lead.travelers?.children || 0,
    summary: lead.summary,
    otherInfo: lead.otherInfo || '',
  });

  return { ...data, id: `itin-${Date.now()}`, leadId: lead.id };
};

export const draftFollowUpEmail = async (lead: Lead, agentName: string): Promise<string> => {
  const result = await draftFollowUpEmailAI({
    leadName: lead.name,
    agentName,
    destination: lead.destination,
    travelDate: lead.travelDate || '',
    status: lead.status,
    otherInfo: lead.otherInfo || lead.rawInquiry,
  });

  return result.email;
};