import type { ComponentProps } from 'react';
import type Ionicons from '@expo/vector-icons/Ionicons';

export type AddStopStoreIconSpec = {
  backgroundColor: string;
  glyph: ComponentProps<typeof Ionicons>['name'];
  glyphColor: string;
  label?: string;
};

function matchName(name: string, patterns: RegExp[]): boolean {
  const normalized = name.toLowerCase();

  return patterns.some((pattern) => pattern.test(normalized));
}

export function resolveAddStopStoreIcon(storeName: string): AddStopStoreIconSpec {
  if (matchName(storeName, [/kroger/])) {
    return {
      backgroundColor: '#E53935',
      glyph: 'storefront-outline',
      glyphColor: '#FFFFFF',
      label: 'K',
    };
  }

  if (matchName(storeName, [/albertsons/, /safeway/])) {
    return {
      backgroundColor: '#2E7D32',
      glyph: 'cart-outline',
      glyphColor: '#FFFFFF',
    };
  }

  if (matchName(storeName, [/tom thumb/, /market street/])) {
    return {
      backgroundColor: '#EF6C00',
      glyph: 'restaurant-outline',
      glyphColor: '#FFFFFF',
    };
  }

  if (matchName(storeName, [/shell/, /chevron/, /exxon/, /bp /])) {
    return {
      backgroundColor: '#7B1FA2',
      glyph: 'car-outline',
      glyphColor: '#FFFFFF',
    };
  }

  if (matchName(storeName, [/walmart/, /target/, /costco/, /sam's/])) {
    return {
      backgroundColor: '#1565C0',
      glyph: 'cart-outline',
      glyphColor: '#FFFFFF',
    };
  }

  if (matchName(storeName, [/7-eleven/, /7 eleven/])) {
    return {
      backgroundColor: '#5E35B1',
      glyph: 'flag-outline',
      glyphColor: '#FFFFFF',
    };
  }

  return {
    backgroundColor: '#2A3140',
    glyph: 'storefront-outline',
    glyphColor: '#FFFFFF',
  };
}
