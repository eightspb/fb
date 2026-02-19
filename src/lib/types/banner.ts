/**
 * Типы для системы информационного баннера
 */

export interface SiteBanner {
  id: string;
  enabled: boolean;
  message: string;
  style: 'static' | 'marquee';
  bg_color: string;
  text_color: string;
  font_size: string;
  font_weight: 'normal' | 'medium' | 'bold';
  dismissible: boolean;
  created_at: string;
  updated_at: string;
}

export interface BannerSettings {
  enabled: boolean;
  message: string;
  style: 'static' | 'marquee';
  bg_color: string;
  text_color: string;
  font_size: string;
  font_weight: 'normal' | 'medium' | 'bold';
  dismissible: boolean;
}

export interface BannerApiResponse {
  enabled: boolean;
  banner?: SiteBanner;
}
