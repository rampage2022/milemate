import { AppColors } from '@/components/shared/app-theme';

export type HomeActionCardVariant = 'newWorkday' | 'loadWorkday' | 'workdayHistory';

type GradientStop = readonly [string, string];

type HomeActionCardGradientSpec = {
  accentColor: string;
  colors: GradientStop;
  end: { x: number; y: number };
  start: { x: number; y: number };
};

/** Approximates mockup glow: accent wash from the icon edge into `AppColors.card`. */
export const HOME_ACTION_CARD_GRADIENTS: Record<
  HomeActionCardVariant,
  HomeActionCardGradientSpec
> = {
  newWorkday: {
    accentColor: AppColors.blue,
    colors: ['rgba(0, 122, 255, 0.32)', 'rgba(28, 34, 46, 1)'],
    start: { x: 0, y: 0.5 },
    end: { x: 1, y: 0.5 },
  },
  loadWorkday: {
    accentColor: AppColors.green,
    colors: ['rgba(52, 199, 89, 0.28)', 'rgba(28, 34, 46, 1)'],
    start: { x: 0, y: 0.5 },
    end: { x: 1, y: 0.5 },
  },
  workdayHistory: {
    accentColor: AppColors.orange,
    colors: ['rgba(255, 149, 0, 0.28)', 'rgba(28, 34, 46, 1)'],
    start: { x: 0, y: 0.5 },
    end: { x: 1, y: 0.5 },
  },
};
