// Table of Contents for "Koltey Golai" by Basant Pradhan.
// Page numbers are 1-indexed PDF page numbers.
// PDF pages 1-2 are the landscape cover spread; printed page N = PDF page N+2.

export interface TocEntry {
  title: string;       // Chapter/section title (Nepali Devanagari)
  titleEn?: string;    // English gloss / romanisation (optional)
  page: number;        // 1-indexed PDF page number
}

export const TABLE_OF_CONTENTS: TocEntry[] = [
  { title: 'कृतज्ञता क्रमाङ्क',         titleEn: 'Acknowledgements',          page: 11  },
  { title: 'उपन्यासको पाँच मुहानतिर!', titleEn: "Author's Note",              page: 13  },
  { title: 'बरपीपल',                    titleEn: 'Barpeepal',                  page: 17  },
  { title: 'मङ्गलसिंह',                 titleEn: 'Mangalsingh',                page: 25  },
  { title: 'कमलकुटीर : एक',            titleEn: 'Kamal Kutir — I',            page: 32  },
  { title: 'कमलकुटीर : दुई',           titleEn: 'Kamal Kutir — II',           page: 42  },
  { title: 'बनमारा',                    titleEn: 'Banamara',                   page: 51  },
  { title: 'दिल्ली भाग्यो',             titleEn: 'Delhi Bhagyo',               page: 62  },
  { title: 'ठुलो एन्टिना',              titleEn: 'Thulo Antenna',              page: 80  },
  { title: 'रङबारी',                    titleEn: 'Rangbari',                   page: 90  },
  { title: 'आहिसे',                     titleEn: 'Ahise',                      page: 101 },
  { title: 'हरियो पहाइ',               titleEn: 'Hariyo Pahai',               page: 111 },
  { title: 'केको डर!',                  titleEn: 'Keko Dar!',                  page: 123 },
  { title: 'परीक्षा',                   titleEn: 'Pariksha',                   page: 136 },
  { title: 'सयोग',                      titleEn: 'Sayog',                      page: 144 },
  { title: 'स्मृतिका घुम्तीहरूमा',     titleEn: 'Smritika Ghumtiharu',        page: 167 },
];
