import {
  AndroidConfig,
  ConfigPlugin,
  withDangerousMod,
  withAndroidManifest,
} from '@expo/config-plugins';
import {
  buildResourceItem,
  readResourcesXMLAsync,
} from '@expo/config-plugins/build/android/Resources';
import { writeXMLAsync } from '@expo/config-plugins/build/utils/XML';
import { ExpoConfig } from '@expo/config-types';
import { generateImageAsync } from '@expo/image-utils';
import { writeFileSync, unlinkSync, copyFileSync, existsSync, mkdirSync } from 'fs';
import { basename, resolve } from 'path';

import { NotificationsPluginProps } from './withNotifications';

const { Colors } = AndroidConfig;
const { ANDROID_RES_PATH, dpiValues } = AndroidConfig.Icon;
const {
  addMetaDataItemToMainApplication,
  getMainApplicationOrThrow,
  removeMetaDataItemFromMainApplication,
} = AndroidConfig.Manifest;
const BASELINE_PIXEL_SIZE = 24;
export const META_DATA_NOTIFICATION_ICON = 'expo.modules.notifications.default_notification_icon';
export const META_DATA_NOTIFICATION_ICON_COLOR =
  'expo.modules.notifications.default_notification_color';
export const NOTIFICATION_ICON = 'notification_icon';
export const NOTIFICATION_ICON_RESOURCE = `@drawable/${NOTIFICATION_ICON}`;
export const NOTIFICATION_ICON_COLOR = 'notification_icon_color';
export const NOTIFICATION_ICON_COLOR_RESOURCE = `@color/${NOTIFICATION_ICON_COLOR}`;

export const withNotificationIcons: ConfigPlugin<{ icon: string | null }> = (config, { icon }) => {
  // If no icon provided in the config plugin props, fallback to value from app.json
  icon = icon || getNotificationIcon(config);
  return withDangerousMod(config, [
    'android',
    async config => {
      await setNotificationIconAsync(icon, config.modRequest.projectRoot);
      return config;
    },
  ]);
};

export const withNotificationIconColor: ConfigPlugin<{ color: string | null }> = (
  config,
  { color }
) => {
  // If no color provided in the config plugin props, fallback to value from app.json
  color = color || getNotificationColor(config);
  return withDangerousMod(config, [
    'android',
    async config => {
      await setNotificationIconColorAsync(color, config.modRequest.projectRoot);
      return config;
    },
  ]);
};

export const withNotificationManifest: ConfigPlugin<{
  icon: string | null;
  color: string | null;
}> = (config, { icon, color }) => {
  // If no icon or color provided in the config plugin props, fallback to value from app.json
  icon = icon || getNotificationIcon(config);
  color = color || getNotificationColor(config);
  return withAndroidManifest(config, config => {
    config.modResults = setNotificationConfig({ icon, color }, config.modResults);
    return config;
  });
};

export const withNotificationSounds: ConfigPlugin<{ sounds: string[] }> = (config, { sounds }) => {
  return withDangerousMod(config, [
    'android',
    config => {
      setNotificationSounds(sounds, config.modRequest.projectRoot);
      return config;
    },
  ]);
};

export function getNotificationIcon(config: ExpoConfig) {
  return config.notification?.icon || null;
}

export function getNotificationColor(config: ExpoConfig) {
  return config.notification?.color || null;
}

/**
 * Applies notification icon configuration for expo-notifications
 */
export async function setNotificationIconAsync(icon: string | null, projectRoot: string) {
  if (icon) {
    await writeNotificationIconImageFilesAsync(icon, projectRoot);
  } else {
    removeNotificationIconImageFiles(projectRoot);
  }
}

function setNotificationConfig(
  props: { icon: string | null; color: string | null },
  manifest: AndroidConfig.Manifest.AndroidManifest
) {
  const mainApplication = getMainApplicationOrThrow(manifest);
  if (props.icon) {
    addMetaDataItemToMainApplication(
      mainApplication,
      META_DATA_NOTIFICATION_ICON,
      NOTIFICATION_ICON_RESOURCE,
      'resource'
    );
  } else {
    removeMetaDataItemFromMainApplication(mainApplication, META_DATA_NOTIFICATION_ICON);
  }
  if (props.color) {
    addMetaDataItemToMainApplication(
      mainApplication,
      META_DATA_NOTIFICATION_ICON_COLOR,
      NOTIFICATION_ICON_COLOR_RESOURCE,
      'resource'
    );
  } else {
    removeMetaDataItemFromMainApplication(mainApplication, META_DATA_NOTIFICATION_ICON_COLOR);
  }
  return manifest;
}

export async function setNotificationIconColorAsync(color: string | null, projectRoot: string) {
  const colorsXmlPath = await Colors.getProjectColorsXMLPathAsync(projectRoot);
  let colorsJson = await readResourcesXMLAsync({ path: colorsXmlPath });
  if (color) {
    const colorItemToAdd = buildResourceItem({ name: NOTIFICATION_ICON_COLOR, value: color });
    colorsJson = Colors.setColorItem(colorItemToAdd, colorsJson);
  } else {
    colorsJson = Colors.removeColorItem(NOTIFICATION_ICON_COLOR, colorsJson);
  }
  await writeXMLAsync({ path: colorsXmlPath, xml: colorsJson });
}

async function writeNotificationIconImageFilesAsync(icon: string, projectRoot: string) {
  await Promise.all(
    Object.values(dpiValues).map(async ({ folderName, scale }) => {
      const drawableFolderName = folderName.replace('mipmap', 'drawable');
      const dpiFolderPath = resolve(projectRoot, ANDROID_RES_PATH, drawableFolderName);
      if (!existsSync(dpiFolderPath)) {
        mkdirSync(dpiFolderPath, { recursive: true });
      }
      const iconSizePx = BASELINE_PIXEL_SIZE * scale;

      try {
        const resizedIcon = (
          await generateImageAsync(
            { projectRoot, cacheType: 'android-notification' },
            {
              src: icon,
              width: iconSizePx,
              height: iconSizePx,
              resizeMode: 'cover',
              backgroundColor: 'transparent',
            }
          )
        ).source;
        writeFileSync(resolve(dpiFolderPath, NOTIFICATION_ICON + '.png'), resizedIcon);
      } catch (e) {
        throw new Error('Encountered an issue resizing Android notification icon: ' + e);
      }
    })
  );
}

function removeNotificationIconImageFiles(projectRoot: string) {
  Object.values(dpiValues).forEach(async ({ folderName }) => {
    const drawableFolderName = folderName.replace('mipmap', 'drawable');
    const dpiFolderPath = resolve(projectRoot, ANDROID_RES_PATH, drawableFolderName);
    unlinkSync(resolve(dpiFolderPath, NOTIFICATION_ICON + '.png'));
  });
}

/**
 * Save sound files to `<project-root>/android/app/src/main/res/raw`
 */
export function setNotificationSounds(sounds: string[], projectRoot: string) {
  if (!Array.isArray(sounds)) {
    throw new Error(
      `Must provide an array of sound files in your app config, found ${typeof sounds}.`
    );
  }
  for (const soundFileRelativePath of sounds) {
    writeNotificationSoundFile(soundFileRelativePath, projectRoot);
  }
}

/**
 * Copies the input file to the `<project-root>/android/app/src/main/res/raw` directory if
 * there isn't already an existing file under that name.
 */
function writeNotificationSoundFile(soundFileRelativePath: string, projectRoot: string) {
  const rawResourcesPath = resolve(projectRoot, ANDROID_RES_PATH, 'raw');
  const inputFilename = basename(soundFileRelativePath);

  if (inputFilename) {
    try {
      const sourceFilepath = resolve(projectRoot, soundFileRelativePath);
      const destinationFilepath = resolve(rawResourcesPath, inputFilename);
      if (!existsSync(rawResourcesPath)) {
        mkdirSync(rawResourcesPath, { recursive: true });
      }
      copyFileSync(sourceFilepath, destinationFilepath);
    } catch (e) {
      throw new Error('Encountered an issue copying Android notification sounds: ' + e);
    }
  }
}

export const withNotificationsAndroid: ConfigPlugin<NotificationsPluginProps> = (
  config,
  { icon = null, color = null, sounds = [] }
) => {
  config = withNotificationIconColor(config, { color });
  config = withNotificationIcons(config, { icon });
  config = withNotificationManifest(config, { icon, color });
  config = withNotificationSounds(config, { sounds });
  return config;
};
