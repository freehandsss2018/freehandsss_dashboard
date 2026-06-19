// decoder.mjs — Meta DYI mojibake 修復 (C6)
//
// 原理：Meta 匯出 JSON 時，把 UTF-8 位元組逐個當成 Latin-1 (ISO-8859-1) 碼位
// 寫成 \uXX escape。例：「李」UTF-8 = E6 9D 8E → 被寫成 æ。
// JSON.parse 後得到三個 ≤0xFF 的字元，需把佢哋當回位元組以 UTF-8 重新解碼。
//
// ⚠️ 守衛（C6）：toString('utf8') 對非法序列不 throw，只產 U+FFFD(�)。
// 故解碼後若 U+FFFD 增加，或原字串本身含 >0xFF 的真字元（已正確/emoji），
// 一律保留原值，避免把正確內容打壞。

/**
 * 解碼單一字串。非 mojibake 形狀（含 >0xFF 字元）或解碼變差時，原樣返回。
 * @param {string} input
 * @returns {string}
 */
export function decodeMetaMojibake(input) {
  if (typeof input !== 'string' || input.length === 0) return input;

  // 若含 >0xFF 的字元（含 emoji surrogate），代表已是正確內容，不可再 latin1→utf8。
  for (let i = 0; i < input.length; i++) {
    if (input.charCodeAt(i) > 0xFF) return input;
  }

  try {
    const decoded = Buffer.from(input, 'latin1').toString('utf8');
    const before = (input.match(/�/g) || []).length;
    const after = (decoded.match(/�/g) || []).length;
    if (after > before) return input; // 解碼引入新亂碼 → 放棄
    return decoded;
  } catch {
    return input;
  }
}

/**
 * 遞迴解碼物件/陣列內所有字串欄位（不改 key）。
 * @param {*} value
 * @returns {*}
 */
export function decodeDeep(value) {
  if (typeof value === 'string') return decodeMetaMojibake(value);
  if (Array.isArray(value)) return value.map(decodeDeep);
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value)) out[k] = decodeDeep(value[k]);
    return out;
  }
  return value;
}
