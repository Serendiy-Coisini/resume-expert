import type { IHJSchema } from "@/types/lego";

export const LEGO_DRAFT_KEY = "legoDesignerDraft";
export const LEGO_DRAFT_TIME_KEY = "legoDesignerDraftTime";

export interface SaveDraftResult {
  success: boolean;
  savedTime?: string;
  error?: unknown;
}

export interface LegoDraftRecord {
  version: 1;
  schema: IHJSchema | null;
  savedTime: string;
}

export interface LoadDraftResult {
  schema: IHJSchema | null;
  savedTime: string | null;
  exists: boolean;
  corrupted: boolean;
}

/**
 * 统一将积木简历草稿与保存时间打包在单一版本化 JSON 条目中原子写入 localStorage。
 * 单次操作具备天然原子性，彻底杜绝“新草稿 + 旧时间”或回滚失败导致的数据不一致问题。
 */
export function saveLegoDraft(schema: IHJSchema | null | undefined): SaveDraftResult {
  if (typeof window === "undefined") {
    return { success: false };
  }

  try {
    const nowStr = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
    const record: LegoDraftRecord = {
      version: 1,
      schema: schema ?? null,
      savedTime: nowStr,
    };

    localStorage.setItem(LEGO_DRAFT_KEY, JSON.stringify(record));
    return { success: true, savedTime: nowStr };
  } catch (error) {
    return { success: false, error };
  }
}

function isValidLegoSchema(val: unknown): val is IHJSchema {
  return Boolean(
    val &&
    typeof val === "object" &&
    Array.isArray((val as Partial<IHJSchema>).componentsTree)
  );
}

/**
 * 从浏览器本地 localStorage 读取保存的积木简历草稿及时间戳。
 * 优先解析版本化信封对象，并向后兼容读取旧版本直接存储的 IHJSchema 与时间键；
 * 所有存储读取均置于 try-catch 保护下，并精准返回是否存在和是否损坏标志。
 */
export function loadLegoDraft(): LoadDraftResult {
  if (typeof window === "undefined") {
    return { schema: null, savedTime: null, exists: false, corrupted: false };
  }
  try {
    const saved = localStorage.getItem(LEGO_DRAFT_KEY);
    if (!saved) {
      let legacyTime: string | null = null;
      try {
        legacyTime = localStorage.getItem(LEGO_DRAFT_TIME_KEY);
      } catch {
        // 存储受限静默处理
      }
      return { schema: null, savedTime: legacyTime, exists: false, corrupted: false };
    }

    try {
      const parsed = JSON.parse(saved);
      // 1. 版本化信封格式：{ version: 1, schema: ..., savedTime: ... }
      if (parsed && typeof parsed === "object" && "version" in parsed && "schema" in parsed) {
        if (parsed.version !== 1) {
          return { schema: null, savedTime: null, exists: true, corrupted: true };
        }
        if (parsed.schema !== null && !isValidLegoSchema(parsed.schema)) {
          return { schema: null, savedTime: null, exists: true, corrupted: true };
        }
        return {
          schema: (parsed.schema as IHJSchema) ?? null,
          savedTime: typeof parsed.savedTime === "string" ? parsed.savedTime : null,
          exists: true,
          corrupted: false,
        };
      }
      // 2. 向后兼容旧格式：直接存储 IHJSchema，时间存储在 LEGO_DRAFT_TIME_KEY
      if (!isValidLegoSchema(parsed)) {
        return { schema: null, savedTime: null, exists: true, corrupted: true };
      }
      let legacyTime: string | null = null;
      try {
        legacyTime = localStorage.getItem(LEGO_DRAFT_TIME_KEY);
      } catch {
        // 存储受限静默处理
      }
      return {
        schema: parsed as IHJSchema,
        savedTime: legacyTime,
        exists: true,
        corrupted: false,
      };
    } catch {
      return { schema: null, savedTime: null, exists: true, corrupted: true };
    }
  } catch {
    return { schema: null, savedTime: null, exists: false, corrupted: false };
  }
}
