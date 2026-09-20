import type { UserInput } from "@/types/resume";

export interface PIIAnonymizeResult {
  anonymizedInput: UserInput;
  piiMap: Map<string, string>; // placeholder -> original
}

/**
 * Anonymize sensitive PII data in UserInput before sending to external LLM APIs.
 */
export function anonymizePayload<T>(input: T, enabled = true): { value: T; piiMap: Map<string, string> } {
  const piiMap = new Map<string, string>();
  const entities = new Map<string, string>();
  const counts = new Map<string, number>();
  const remember = (raw: string, kind: string) => {
    const value = raw.trim();
    if (!value || entities.has(value)) return;
    const n = (counts.get(kind) ?? 0) + 1; counts.set(kind, n);
    const token = '[PII_' + kind + '_' + n + ']';
    entities.set(value, token); piiMap.set(token, value);
  };
  const discover = (value: unknown, key = ''): void => {
    if (typeof value === 'string') {
      if (['name', 'company', 'address', 'phone', 'email'].includes(key)) remember(value, key.toUpperCase());
      if (key === 'originalResume' || key === 'content') {
        const first = value.trimStart().split(/\r?\n/)[0]?.trim();
        if (first && (/^[\u4e00-\u9fa5]{2,4}$/.test(first) || /^[A-Z][a-z]+(?:[ '-][A-Z][a-z]+){1,3}$/.test(first))) remember(first, 'NAME');
      }
      for (const match of value.matchAll(/(?:姓名|候选人|求职者|Name)[:： \t]+([\u4e00-\u9fa5]{2,4}|[A-Za-z][A-Za-z .'-]{1,60})(?=$|[^\u4e00-\u9fa5])/gi)) remember(match[1], 'NAME');
      for (const match of value.matchAll(/(?:详细地址|住址|地址|Address)[:： \t]+([^\r\n|；;]{3,100})/gi)) remember(match[1], 'ADDRESS');
      for (const match of value.matchAll(/(?:公司名称|公司|Company)[:： \t]+([^\r\n|·；;]{2,80})/gi)) remember(match[1], 'COMPANY');
      for (const match of value.matchAll(/[\u4e00-\u9fa5A-Za-z0-9（）()]{2,50}(?:有限公司|股份公司|集团公司)/g)) remember(match[0].replace(/^(?:供职于|任职于|就职于|公司名称|公司)/, ''), 'COMPANY');
      for (const match of value.matchAll(/\b[1-9]\d{5}(?:18|19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]\b/g)) remember(match[0], 'ID');
      for (const match of value.matchAll(/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g)) remember(match[0], 'EMAIL');
      for (const match of value.matchAll(/(?:\+?86[- \t]?)?1[3-9]\d[- \t]?\d{4}[- \t]?\d{4}\b/g)) remember(match[0], 'PHONE');
      for (const match of value.matchAll(/\+\d[\d ()-]{6,24}\d/g)) {
        const digits = match[0].replace(/\D/g, '');
        if (digits.length >= 8 && digits.length <= 15) remember(match[0], 'PHONE');
      }
      for (const match of value.matchAll(/(?:电话|手机|Phone|Tel)[:： \t]+([+\d][\d ()-]{6,24}\d)/gi)) remember(match[1], 'PHONE');
      for (const match of value.matchAll(/(?:微信|微信号|WeChat|wx)[:： \t]+([a-zA-Z0-9_-]{5,30})/gi)) remember(match[1], 'WECHAT');
    } else if (Array.isArray(value)) value.forEach(item => discover(item, key));
    else if (value && typeof value === 'object') Object.entries(value).forEach(([field, item]) => {
      if (!['avatarUrl','rawFileName','rawFileType','rawFileDataUrl'].includes(field)) discover(item, field);
    });
  };
  if (enabled) discover(input);
  const orderedEntities = [...entities.keys()].sort((a, b) => b.length - a.length);
  const pattern = orderedEntities.length ? new RegExp(orderedEntities.map(value => value.replace(/[.*+?^{}()|[\]\\$]/g, '\\$&')).join('|'), 'g') : null;
  const maskText = (text: string): string => pattern ? text.replace(pattern, value => entities.get(value)!) : text;

  const visit = (value: unknown): unknown => {
    if (typeof value === "string") {
      return maskText(value);
    }
    if (Array.isArray(value)) return value.map((item) => visit(item));
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value)
        .filter(([field]) => !["avatarUrl", "rawFileName", "rawFileType", "rawFileDataUrl"].includes(field))
        .map(([field, item]) => [field, visit(item)]));
    }
    return value;
  };
  return { value: visit(input) as T, piiMap };
}

/**
 * @deprecated 建议直接使用支持泛型任意负载与脱敏开关控制的 `anonymizePayload`。
 */
export function anonymizeUserInput(input: UserInput): PIIAnonymizeResult {
  const { value, piiMap } = anonymizePayload(input);
  return { anonymizedInput: value, piiMap };
}

/**
 * Restore placeholders back to original values in AnalysisResult or strings.
 */
export function restorePIIText(text: string, piiMap: Map<string, string>): string {
  if (!text || piiMap.size === 0) return text;
  let restored = text;
  for (const [placeholder, original] of piiMap.entries()) {
    restored = restored.replaceAll(placeholder, original);
  }
  return restored;
}

/**
 * Deeply restore AnalysisResult values replacing PII placeholders with original values.
 */
export function restoreAnalysisResult<T>(
  result: T,
  piiMap: Map<string, string>
): T {
  if (!result || piiMap.size === 0) return result;

  const restore = (value: unknown): unknown => {
    if (typeof value === "string") return restorePIIText(value, piiMap);
    if (Array.isArray(value)) return value.map(restore);
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, restore(item)]));
    return value;
  };
  return restore(result) as T;
}
