import { isUndefined } from '../is';

export type BookmarkColor = {
  odd: string
  even: string
}

export type ReadColor = {
  id: string,
  backgroundColor: string,
  textColor: string,
  bookmarkColor: BookmarkColor,
  readAloudColor: string,
}
export class DefaultReadColor {
  static readonly GREEN_QINGCAO: ReadColor = {
    id: 'VzeCYARdfw_V4STDOPqaN',
    backgroundColor: '#E3EDCD',
    textColor: '#324F00',
    bookmarkColor: {
      odd: '#00912C',
      even: 'currentColor'
    },
    readAloudColor: '#009966'
  }
  static readonly GREEN_HUYAN: ReadColor = {
    id: 'q5ASQqYHRHE8ZfmrqTd2t',
    backgroundColor: '#46784B',
    textColor: '#2D2D2D',
    bookmarkColor: {
      odd: '#1C1649',
      even: 'currentColor'
    },
    readAloudColor: '#123A3D'
  }
  static readonly YELLOW_XINGREN: ReadColor = {
    id: 'WwQheXytBQkPmVrPZyNMB',
    backgroundColor: '#FAF9DE',
    textColor: '#2D2D2D',
    bookmarkColor: {
      odd: '#C8B82E',
      even: 'currentColor'
    },
    readAloudColor: '#6D9C00'
  }
  static readonly BROWN_QIUYE: ReadColor = {
    id: 'TPBuWNSxY_PjjzD4OvJtW',
    backgroundColor: '#FFF2E2',
    textColor: '#2D2D2D',
    bookmarkColor: {
      odd: '#EF5A1A',
      even: 'currentColor'
    },
    readAloudColor: '#E34D9D'
  }
  static readonly RED_YANZHI: ReadColor = {
    id: 'LddTKBJk0BpYZLeKZJqQQ',
    backgroundColor: '#FDE6E0',
    textColor: '#2D2D2D',
    bookmarkColor: {
      odd: '#DE640D',
      even: 'currentColor'
    },
    readAloudColor: '#704DB5'
  }
  static readonly BLUE_HAITIAN: ReadColor = {
    id: '97PsnTgv1awCwZZQbFilS',
    backgroundColor: '#DCE2F1',
    textColor: '#2D2D2D',
    bookmarkColor: {
      odd: '#44B0DA',
      even: 'currentColor'
    },
    readAloudColor: '#43A3EF'
  }
  static readonly PURPLE_GEJIN: ReadColor = {
    id: 'zaREtZXt1reKcxD6Wp3Ld',
    backgroundColor: '#E9EBFE',
    textColor: '#2D2D2D',
    bookmarkColor: {
      odd: '#8784E3',
      even: 'currentColor'
    },
    readAloudColor: '#DA70D6'
  }

  private static readonly MAP = new Map<string, ReadColor>();
  static {
    for (const key in DefaultReadColor) {
      const {
        id,
        textColor,
        backgroundColor,
        bookmarkColor,
        readAloudColor
      } = (<any>DefaultReadColor)[key];
      if (
        isUndefined(id) ||
        isUndefined(textColor) ||
        isUndefined(backgroundColor) ||
        isUndefined(bookmarkColor) ||
        isUndefined(readAloudColor)
      ) {
        break;
      }
      DefaultReadColor.MAP.set(id, {
        id,
        textColor,
        backgroundColor,
        bookmarkColor: structuredClone(bookmarkColor),
        readAloudColor
      });
    }
  }

  static get(id: string) {
    return DefaultReadColor.MAP.get(id);
  }
  static getAll() {
    return [...DefaultReadColor.MAP.values()];
  }
}