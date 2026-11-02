import type {HotelEntry,QuoteData} from '../types';
export function fitHotelNights(hotels:HotelEntry[],nights:number,previousNights=nights,removedDay?:number):HotelEntry[]{
 const total=Math.max(0,Math.floor(nights)),previous=Math.max(0,Math.floor(previousNights));let legacyOffset=0;
 return (hotels || []).map(h=>{
  const explicit=Array.isArray(h.selectedNightIndices)&&h.selectedNightIndices.length>0;
  let selected=explicit?[...h.selectedNightIndices!]:Array.from({length:Math.max(0,Math.floor(Number(h.nights)||0))},(_,i)=>legacyOffset+i);
  legacyOffset+=Math.max(0,Math.floor(Number(h.nights)||0));
  selected=[...new Set(selected)].filter(n=>Number.isInteger(n)&&n>=0&&n<previous).sort((a,b)=>a-b);
  const filledSingle=hotels.length===1 && selected.length===previous;
  if(removedDay!==undefined && previous>total){const removedNight=Math.min(removedDay,previous-1);selected=selected.filter(n=>n!==removedNight).map(n=>n>removedNight?n-1:n);}
  if(total>previous && filledSingle)selected=Array.from({length:total},(_,i)=>i);
  selected=selected.filter(n=>n<total);
  return {...h,nights:selected.length,selectedNightIndices:selected};
 });
}
export function reconcileQuoteStays<T extends Partial<QuoteData>>(quote:T,previousNights?:number,removedDay?:number):T{
 const nights=Array.isArray(quote.itinerary)&&quote.itinerary.length>0?Math.max(0,quote.itinerary.length-1):Math.max(0,Math.floor(Number(quote.nights??6)));
 const previous=previousNights??Math.max(nights,Number(quote.nights??nights));
 const result:any={...quote,nights};
 if(Array.isArray(quote.hotels))result.hotels=fitHotelNights(quote.hotels,nights,previous,removedDay);
 if(quote.hotelAlternative){let remaining=nights;const hotels=quote.hotelAlternative.hotels.map(h=>{const count=Math.min(remaining,Math.max(0,Math.floor(Number(h.nights)||0)));remaining-=count;return {...h,nights:count};}).filter(h=>h.nights>0);result.hotelAlternative=hotels.length?{...quote.hotelAlternative,hotels}:null;}
 return result;
}
