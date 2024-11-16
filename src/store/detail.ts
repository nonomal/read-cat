import { defineStore } from 'pinia';
import { isNull, isNumber, isUndefined } from '../core/is';
import { DetailEntity } from '../core/book/book';
import { useWindowStore } from './window';
import { PagePath } from '../core/window';
import { useBookshelfStore } from './bookshelf';
import { BookSource } from '../core/plugins/defined/booksource';
import { newError } from '../core/utils';
import { BookParser } from '../core/book/book-parser';
import { nextTick } from 'vue';

export interface DetailPageResult extends DetailEntity {
  pid: string,
  pluginVersionCode: number,
  baseUrl: string
}

export const useDetailStore = defineStore('Detail', {
  state: () => {
    return {
      detailResult: null as DetailPageResult | null,
      isRunningGetDetailPage: false,
      error: null as string | null,
      currentDetailUrl: null as string | null,
      currentPage: 1,
      currentReadIndex: -1,
      currentReadScrollTop: {
        chapterIndex: 0,
        scrollTop: 0
      },
      cacheIndexs: {} as Record<string, number[]>,
      currentPid: null as string | null,
    }
  },
  getters: {

  },
  actions: {
    setCurrentReadIndex(index: number) {
      if (isNumber(index)) {
        this.currentReadIndex = index;
      } else {
        this.currentReadIndex = -1;
      }
    },
    async getDetailPage(pid: string, url: string, refresh = false): Promise<void> {
      const win = useWindowStore();
      const bookshelf = useBookshelfStore();
      try {
        if (this.isRunningGetDetailPage) {
          return;
        }
        this.isRunningGetDetailPage = true;
        win.disableShowSearchBox.set(PagePath.DETAIL, true);
        this.detailResult = null;
        this.error = null;
        this.currentDetailUrl = null;
        this.currentPid = null;
        this.cacheIndexs[url] = [];
        const plugin = GLOBAL_PLUGINS.getPluginById<BookSource>(pid);
        let BASE_URL;
        if (pid === BookParser.PID) {
          BASE_URL = BookParser.BASE_URL;
        } else {
          if (isUndefined(plugin?.props.BASE_URL)) {
            this.error = `无法获取插件请求链接`;
            return;
          }
          BASE_URL = plugin.props.BASE_URL.trim();
        }
        const book = await GLOBAL_DB.store.bookshelfStore.getByPidAndDetailPageUrl(pid, url);
        if (isNull(book) && pid === BookParser.PID) {
          this.error = '无法获取详情页';
          return;
        }
        if (!isNull(book)) {
          await bookshelf.put({
            ...book,
            timestamp: Date.now()
          });
          const cacheIndexs = (await GLOBAL_DB.store.textContentStore.getByPidAndDetailUrl(pid, url))?.map(v => v.chapter.index);
          this.cacheIndexs[url] = isUndefined(cacheIndexs) ? [] : cacheIndexs;
          if (!refresh || pid === BookParser.PID) {
            if (book.baseUrl !== BASE_URL) {
              this.error = '插件请求目标链接不匹配, 请更新详情页';
              return;
            }
            this.detailResult = book;
            this.setCurrentReadIndex(book.readIndex);
            this.currentReadScrollTop = {
              chapterIndex: book.readIndex,
              scrollTop: book.readScrollTop
            };
            this.currentDetailUrl = url;
            this.currentPid = pid;
            return;
          }
        }
        if (isUndefined(plugin)) {
          this.error = `无法获取插件, 插件ID:${pid}不存在`;
          return;
        }
        if (isNull(plugin.instance)) {
          throw newError(`插件未启用, 插件ID:${pid}`);
        }
        const detail = await plugin.instance.getDetail(url);
        const obj = {
          bookname: detail.bookname.trim(),
          author: detail.author.trim(),
          coverImageUrl: detail.coverImageUrl.trim(),
          latestChapterTitle: detail.latestChapterTitle?.trim(),
          intro: detail.intro?.trim(),
          chapterList: detail.chapterList.map((v, index) => {
            return {
              title: v.title.trim(),
              url: v.url.trim(),
              index
            };
          }),
          pid: plugin.props.ID,
          pluginVersionCode: plugin.props.VERSION_CODE,
          baseUrl: BASE_URL,
        }
        if (book && refresh) {
          await bookshelf.put({
            id: book.id,
            detailPageUrl: url,
            readIndex: isUndefined(book.readIndex) ? -1 : book.readIndex,
            readScrollTop: book.readScrollTop,
            searchIndex: [obj.bookname, obj.author].join(' '),
            timestamp: Date.now(),
            ...obj
          });
        } else {
          this.currentPage = 1;
          this.setCurrentReadIndex(-1);
          this.currentReadScrollTop = {
            chapterIndex: -1,
            scrollTop: 0
          };
        }
        this.detailResult = obj;
        this.currentDetailUrl = url;
        this.currentPid = pid;
      } catch (e: any) {
        GLOBAL_LOG.error('Detail store getDetailPage', e);
        this.error = e.message;
        return;
      } finally {
        nextTick(() => {
          this.isRunningGetDetailPage = false;
          win.disableShowSearchBox.set(PagePath.DETAIL, false);
        });
      }
    }
  }
});