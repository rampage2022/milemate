import { SymbolView, type SymbolWeight } from 'expo-symbols';

import { HOME_ICON_SF, type HomeIconToken } from '@/components/home/home-icon-tokens';

type HomeIconProps = {
  color: string;
  name: HomeIconToken;
  size: number;
  weight?: SymbolWeight;
};

/** iOS: hollow SF Symbols aligned to `designs/approved/1_home_screen_v1.png`. */
export function HomeIcon({ color, name, size, weight = 'regular' }: HomeIconProps) {
  return (
    <SymbolView
      name={HOME_ICON_SF[name]}
      resizeMode="scaleAspectFit"
      style={{ height: size, width: size }}
      tintColor={color}
      weight={weight}
    />
  );
}
