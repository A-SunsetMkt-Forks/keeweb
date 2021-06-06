import { Events } from 'util/events';
import { Features } from 'util/features';
import { Locale } from 'util/locale';
import { ThemeWatcher } from 'comp/browser/theme-watcher';
import { AppSettings } from 'models/app-settings';
import { Logger } from 'util/logger';
import { Launcher } from 'comp/launcher';
import { noop } from 'util/fn';
import { WindowClass } from 'comp/browser/window-class';

const logger = new Logger('settings-manager');

const DesktopLocaleKeys = [
    'sysMenuAboutKeeWeb',
    'sysMenuServices',
    'sysMenuHide',
    'sysMenuHideOthers',
    'sysMenuUnhide',
    'sysMenuQuit',
    'sysMenuEdit',
    'sysMenuUndo',
    'sysMenuRedo',
    'sysMenuCut',
    'sysMenuCopy',
    'sysMenuPaste',
    'sysMenuSelectAll',
    'sysMenuWindow',
    'sysMenuMinimize',
    'sysMenuClose'
];

const SettingsManager = {
    activeTheme: null as string | null,

    allLocales: {
        'en-US': 'English',
        'de-DE': 'Deutsch',
        'fr-FR': 'Français'
    } as Record<string, string>,

    allThemes: {
        dark: 'setGenThemeDark',
        light: 'setGenThemeLight',
        sd: 'setGenThemeSd',
        sl: 'setGenThemeSl',
        fb: 'setGenThemeFb',
        bl: 'setGenThemeBl',
        db: 'setGenThemeDb',
        lb: 'setGenThemeLb',
        te: 'setGenThemeTe',
        lt: 'setGenThemeLt',
        dc: 'setGenThemeDc',
        hc: 'setGenThemeHc'
    } as Record<string, string>,

    // changing something here? don't forget about desktop/app.js
    autoSwitchedThemes: [
        {
            name: 'setGenThemeDefault',
            dark: 'dark',
            light: 'light'
        },
        {
            name: 'setGenThemeSol',
            dark: 'sd',
            light: 'sl'
        },
        {
            name: 'setGenThemeBlue',
            dark: 'fb',
            light: 'bl'
        },
        {
            name: 'setGenThemeBrown',
            dark: 'db',
            light: 'lb'
        },
        {
            name: 'setGenThemeTerminal',
            dark: 'te',
            light: 'lt'
        },
        {
            name: 'setGenThemeHighContrast',
            dark: 'dc',
            light: 'hc'
        }
    ],

    customLocales: new Map<string, Record<string, string>>(),
    customThemeNames: new Map<string, string>(),

    init(): void {
        Events.on('dark-mode-changed', () => this.darkModeChanged());
    },

    setBySettings(): void {
        this.setTheme(AppSettings.theme);
        this.setFontSize(AppSettings.fontSize);
        const locale = AppSettings.locale;
        try {
            if (locale) {
                this.setLocale(AppSettings.locale);
            } else {
                this.setLocale(this.getBrowserLocale());
            }
        } catch (ex) {}
    },

    getDefaultTheme(): string {
        return 'dark';
    },

    setTheme(theme: string | undefined | null): void {
        if (!theme) {
            if (this.activeTheme) {
                return;
            }
            theme = this.getDefaultTheme();
        }
        for (const cls of document.body.classList) {
            if (/^th-/.test(cls)) {
                document.body.classList.remove(cls);
            }
        }
        if (AppSettings.autoSwitchTheme) {
            theme = this.selectDarkOrLightTheme(theme);
        }
        WindowClass.setThemeClass(theme);
        const metaThemeColor = document.head.querySelector('meta[name=theme-color]') as
            | HTMLMetaElement
            | undefined;
        if (metaThemeColor) {
            metaThemeColor.content = window.getComputedStyle(document.body).backgroundColor;
        }
        this.activeTheme = theme;
        logger.info('Theme changed', theme);
        Events.emit('theme-changed');
    },

    selectDarkOrLightTheme(theme: string): string {
        for (const config of this.autoSwitchedThemes) {
            if (config.light === theme || config.dark === theme) {
                return ThemeWatcher.dark ? config.dark : config.light;
            }
        }
        return theme;
    },

    darkModeChanged(): void {
        if (AppSettings.autoSwitchTheme) {
            for (const config of this.autoSwitchedThemes) {
                if (config.light === this.activeTheme || config.dark === this.activeTheme) {
                    const newTheme = ThemeWatcher.dark ? config.dark : config.light;
                    logger.info('Setting theme triggered by system settings change', newTheme);
                    this.setTheme(newTheme);
                    break;
                }
            }
        }
    },

    setFontSize(fontSize: number): void {
        const defaultFontSize = Features.isMobile ? 14 : 12;
        const sizeInPx = defaultFontSize + (fontSize || 0) * 2;
        document.documentElement.style.fontSize = `${sizeInPx}px`;
        WindowClass.setFontSizeClass(fontSize);
    },

    setLocale(loc: string | undefined | null): void {
        if (!loc || loc === Locale.localeName) {
            return;
        }
        if (loc === 'en-US') {
            Locale.set(undefined);
        } else {
            let localeValues = this.customLocales.get(loc);
            if (!localeValues) {
                localeValues = require('locales/' + loc + '.json') as Record<string, string>;
            }
            Locale.set(localeValues, loc);
        }
        Events.emit('locale-changed', loc);

        if (Launcher) {
            const localeValuesForDesktopApp: Record<string, string> = {};
            for (const key of DesktopLocaleKeys) {
                localeValuesForDesktopApp[key] = Locale.get(key);
            }
            Launcher.ipcRenderer.invoke('set-locale', loc, localeValuesForDesktopApp).catch(noop);
        }
    },

    getBrowserLocale(): string {
        const language = (navigator.languages && navigator.languages[0]) || navigator.language;
        if (language && language.startsWith('en')) {
            return 'en-US';
        }
        return language;
    }
};

export { SettingsManager };
