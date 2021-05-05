import { ConfigPlugin } from '@expo/config-plugins';
import { ExpoConfig } from '@expo/config-types';
import { NotificationsPluginProps } from './withNotifications';
export declare const META_DATA_NOTIFICATION_ICON = "expo.modules.notifications.default_notification_icon";
export declare const META_DATA_NOTIFICATION_ICON_COLOR = "expo.modules.notifications.default_notification_color";
export declare const NOTIFICATION_ICON = "notification_icon";
export declare const NOTIFICATION_ICON_RESOURCE: string;
export declare const NOTIFICATION_ICON_COLOR = "notification_icon_color";
export declare const NOTIFICATION_ICON_COLOR_RESOURCE: string;
export declare const withNotificationIcons: ConfigPlugin<{
    icon: string | null;
}>;
export declare const withNotificationIconColor: ConfigPlugin<{
    color: string | null;
}>;
export declare const withNotificationManifest: ConfigPlugin<{
    icon: string | null;
    color: string | null;
}>;
export declare const withNotificationSounds: ConfigPlugin<{
    sounds: string[];
}>;
export declare function getNotificationIcon(config: ExpoConfig): string | null;
export declare function getNotificationColor(config: ExpoConfig): string | null;
/**
 * Applies notification icon configuration for expo-notifications
 */
export declare function setNotificationIconAsync(icon: string | null, projectRoot: string): Promise<void>;
export declare function setNotificationIconColorAsync(color: string | null, projectRoot: string): Promise<void>;
/**
 * Save sound files to `<project-root>/android/app/src/main/res/raw`
 */
export declare function setNotificationSounds(sounds: string[], projectRoot: string): void;
export declare const withNotificationsAndroid: ConfigPlugin<NotificationsPluginProps>;
