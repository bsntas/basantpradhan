'use client';

import { usePrefs } from './ThemeProvider';
import { PRICES } from '@/lib/config';

export default function PriceText() {
  const { currency } = usePrefs();
  return <>{PRICES[currency].display}</>;
}
