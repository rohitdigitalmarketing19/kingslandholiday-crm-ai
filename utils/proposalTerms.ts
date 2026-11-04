export const LEGACY_QUOTE_TERMS = `Terms & Conditions

Cancellation Policy (for the land package):
• More than 30 days before the starting date: 25% of the total land package cost will be cancellation fees.
• Between 16-30 days before the starting date: 40% of the total land package cost will be cancellation fees.
• Between 7-15 days before the starting date: 55% of the total land package cost will be cancellation fees.
• Between 3-6 days before the starting date: 70% of the total land package cost will be cancellation fees.
• Within 0-2 days before the starting date: 85% of the total land package cost will be cancellation fees.
• In case of No Show: 100% of the total land package cost will be cancellation fees.
• Peak Periods: No Refund & No Amendment allowed during the Diwali period, Christmas, New Year period, and Long weekends.
• Note: Number of days for cancellation will be counted by first contact and check-in time and date. First contact is considered when you first email / WhatsApp our salesperson cancellation request.

Cancellation Policy (for flights/trains):
• For flights and trains, cancellation charges vary as per airlines / Railways / booking source policies. Cancellation charges will be according to that.

Hotels & Accommodation Guidelines:
• Most of the time hotels mentioned in this quote will be provided. In some cases, if the mentioned hotels are not available due to unforeseen reasons, similar hotels will be provided.
• On 24th Dec - 31st Dec: Gala Dinner may be compulsory in some hotels (ranging from Rs. 1500 per person to Rs. 5000 per person or sometimes higher), payable directly to the hotel.
• Standard Check-in time is 12:00 PM and Check-out time is 10:00 AM (varies as per hotel). Early check-in and/or late check-out is subject to availability and may be chargeable directly to the hotel.
• Itinerary provided in this quote is indicative. It may change before or during the trip if required. No refund will be given in case of a missed itinerary.
• Room Heater: Certain Hotels in Low Budget, Standard, Deluxe categories provide room heaters on request at extra charge. We do not include this cost; travelers settle directly before checkout (INR 250.00 to INR 500.00 per heater per room per night).

Important Information & Permits:
• All guests must carry valid Government Photo IDs (Passport / Driving License / Voter ID). PAN Card is NOT accepted as a valid photo/address ID.
• Guests must carry 4 passport size photographs along with Photo-ID proof (Passport / DL / Voter ID & School ID for children) for Gangtok (Changu Lake / Baba Mandir) and North Sikkim (Lachung) permits.
• Tsomgo Lake, Baba Mandir, Nathula Pass, Gurudongmar, Yumthang & Yumesamdong (Zero Point) depend heavily on weather conditions. In hilly areas, roads may be out of operation at the time of travel. Operational status will be updated during the pre-arrival briefing call.
• Nathula Permit Formalities: Nathula Pass is an optional tour with supplement cost, applied 24 hours prior. Only 5% of vehicles get permits via government lottery. Once a permit is issued, there is no refund if Nathula Pass cannot be visited for any reason.
• Himalayan Mountaineering Institute and Padmaja Naidu Himalayan Zoological Park remain closed on Thursday.
• Toy Train Ride: A 2-hour journey starting from Darjeeling up to Ghoom Station and back, covering Batasia Loop, War Memorial & Ghoom Railway Museum. Cost of tickets and pickup-drop will be borne by the traveler.
• The Tibetan Refugee Centre remains closed on Sunday.
• Vehicle Capacity: Maximum capacity is 6 people (including children) as per Motor Vehicle Act.
• Sector Allotment: In Sikkim and Darjeeling, vehicles are allotted per sector as per syndicate rules; a single vehicle cannot be used for the entire trip. Good vehicles and drivers are assured for each sector.
• Point-to-Point Transfers: All vehicles assigned are on a point-to-point basis and not disposable. Air conditioning will not operate on uphill drives.
• Parking & Entry: Due to parking scarcity, entry restrictions and specific timings apply in many areas.
• Natural Diversions: Landslides are common in hilly areas. Guests must bear additional costs for any diversion/changes due to road blockage, landslide, or political unrest.
• Local Syndicate Excursions: Excursions like Tshangu Lake, Nathula, and North Sikkim are controlled by local transport syndicates. Vehicles and drivers may change for transfers and sightseeing.
• Restricted Area Security: Nathula is a restricted area and can be sealed without notice for security reasons. In such cases, tours operate only up to Tshangu Lake with no refund for unutilized services.
• Payment Schedule: Payments must be cleared as per the payment schedule. Delayed installments attract late payment charges (5% of installment amount).

Pure Agent Declaration (Terms & Conditions):
• We provide our services strictly as a pure agent, and charge a service fee solely for planning, coordinating, and arranging the tour on behalf of the client.
• All other travel-related services (transport, hotel booking, entry tickets, etc.) are arranged on behalf of the customer and recovered at actual cost.
• As a pure agent: We do not intend to hold nor hold any title to the goods or services procured on behalf of the client.
• We do not use such goods or services for our own interest or benefit.
• We recover only the actual amount incurred for third-party services, in addition to our separately charged service fee.
• All legal obligations are subject to Jaipur jurisdiction only.`;


export const PROPOSAL_TERM_SECTIONS = [
  { key: 'cancellation', title: 'Cancellation Policy' },
  { key: 'hotels', title: 'Hotels & Flights' },
  { key: 'important', title: 'Important Information' },
  { key: 'agent', title: 'Pure Agent Declaration' },
] as const;

type TermKey = typeof PROPOSAL_TERM_SECTIONS[number]['key'];
type TermContent = Record<TermKey, string>;

export function manualProposalTerms(text?: string): string {
  const normalized = text?.replace(/\r\n/g, '\n') || '';
  return normalized.trim() === LEGACY_QUOTE_TERMS.trim() ? '' : normalized;
}

export function splitProposalTerms(text = ''): TermContent {
  if (text.startsWith('{')) {
    try {
      const saved = JSON.parse(text);
      if (saved?.version === 1 && PROPOSAL_TERM_SECTIONS.every(({ key }) => typeof saved[key] === 'string')) {
        return { cancellation: saved.cancellation, hotels: saved.hotels, important: saved.important, agent: saved.agent };
      }
    } catch {
      // Older settings contain plain text.
    }
  }
  const sections: Record<TermKey, string[]> = { cancellation: [], hotels: [], important: [], agent: [] };
  let section: TermKey = 'important';
  for (const line of text.replace(/\r\n/g, '\n').split('\n')) {
    const heading = line.trim().replace(/:$/, '').toLowerCase();
    if (/^cancellation policy(?: \((?:for the )?land package\)| · land package)?$/.test(heading)) section = 'cancellation';
    else if (['hotels & flights', 'hotels & accommodation', 'hotels and accommodation', 'hotels & accommodation guidelines', 'cancellation policy (for flights/trains)'].includes(heading)) section = 'hotels';
    else if (['important information', 'important travel information', 'important information & permits'].includes(heading)) section = 'important';
    else if (/^pure agent declaration(?: \(terms & conditions\))?$/.test(heading)) section = 'agent';
    else if (!['terms & conditions', 'terms and conditions'].includes(heading)) sections[section].push(line);
  }
  return {
    cancellation: sections.cancellation.join('\n').trim(),
    hotels: sections.hotels.join('\n').trim(),
    important: sections.important.join('\n').trim(),
    agent: sections.agent.join('\n').trim(),
  };
}

export function serializeProposalTerms(sections: TermContent): string {
  return JSON.stringify({ version: 1, ...sections });
}
