import { defineStore } from 'pinia';
import { PagePath } from '../core/window';
import { useSettingsStore } from './settings';
import { GlobalShortcutKey } from './defined/settings';
import { createHash } from 'crypto';

type Event = 'inited';
type Listener = () => void;
export const useWindowStore = defineStore('Window', {
  state: () => {
    return {
      currentPath: PagePath.BOOKSTORE,
      backgroundColor: '',
      textColor: '',
      isMaximize: false,
      isDark: false,
      readProgress: '0%',
      isFullScreen: false,
      searchBoxHeaderText: '搜索',
      disableShowSearchBox: new Map<PagePath, boolean>(),
      refreshEventMap: new Map<PagePath, () => void>(),
      inited: false,
      isSetShortcutKey: false,
      globalShortcutKeyRegisterError: new Map<keyof GlobalShortcutKey, string>(),
      transparentWindow: false,
      events: new Map<Event, Record<string, Listener>>(),
      isOverwriteTitleBar: false,
    }
  },
  getters: {

  },
  actions: {
    calcReadProgress(e?: HTMLElement | null) {
      !e && (e = (document.querySelector<HTMLElement>('#main')));
      if (!e) {
        return;
      }
      let p = 0;
      if (e.clientHeight === e.scrollHeight) {
        p = 1;
      } else if (e.scrollTop === 0) {
        p = 0;
      } else {
        const offsetHeight = e.scrollTop >= e.offsetHeight ? e.offsetHeight : 0;
        p = (e.scrollTop + offsetHeight) / e.scrollHeight;
        const { options } = useSettingsStore();
        if (options.enableScrollToggleChapter) {
          const sttpcHeight = document.querySelector<HTMLElement>('.scroll-top-to-prev-chapter')?.offsetHeight || 0;
          p -= (sttpcHeight + e.offsetHeight) / e.scrollHeight;
          const tcsHeight = document.querySelector<HTMLElement>('#text-content')?.scrollHeight || 0;
          e.scrollTop >= tcsHeight && (p += (sttpcHeight + e.offsetHeight) / e.scrollHeight);
        }
      }
      this.readProgress = `${(p < 0 ? 0 : p * 100).toFixed(2)}%`;
    },
    onRefresh(page: PagePath, call: () => void) {
      this.refreshEventMap.set(page, call);
    },
    addEventListener(type: Event, listener: Listener) {
      const key = createHash('md5').update(listener.toString()).digest('hex');
      this.events.set(type, {
        ...(this.events.get(type) || {}),
        [key]: listener
      });
    },
    removeEventListener(type: Event, listener: Listener) {
      const events = this.events.get(type);
      if (!events) {
        return;
      }
      const key = createHash('md5').update(listener.toString()).digest('hex');
      delete events[key];
    }
  }
});