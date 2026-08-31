// Table of Contents for "Koltey Golai" by Basant Pradhan
// This is a scanned PDF with no embedded bookmarks.
// Update the `page` values after reviewing the printed book:
//   open the reader, note which PDF page number each chapter starts on,
//   then edit the entries below.

export interface TocEntry {
  title: string;       // Chapter title (Nepali Devanagari)
  titleEn?: string;    // English gloss / romanisation (optional)
  page: number;        // 1-indexed page in the PDF
}

export const TABLE_OF_CONTENTS: TocEntry[] = [
  { title: 'भूमिका',         titleEn: 'Preface',       page: 3  },
  { title: 'अध्याय १',       titleEn: 'Chapter I',     page: 7  },
  { title: 'अध्याय २',       titleEn: 'Chapter II',    page: 21 },
  { title: 'अध्याय ३',       titleEn: 'Chapter III',   page: 35 },
  { title: 'अध्याय ४',       titleEn: 'Chapter IV',    page: 51 },
  { title: 'अध्याय ५',       titleEn: 'Chapter V',     page: 67 },
  { title: 'अध्याय ६',       titleEn: 'Chapter VI',    page: 83 },
  { title: 'अध्याय ७',       titleEn: 'Chapter VII',   page: 99 },
  { title: 'अध्याय ८',       titleEn: 'Chapter VIII',  page: 115 },
  { title: 'अध्याय ९',       titleEn: 'Chapter IX',    page: 131 },
  { title: 'उपसंहार',        titleEn: 'Epilogue',      page: 155 },
  { title: 'लेखकको बारेमा',  titleEn: 'About the Author', page: 171 },
];
