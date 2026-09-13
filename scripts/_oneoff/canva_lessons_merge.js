// scripts/_oneoff/canva_lessons_merge.js
// 一次性合併腳本：canva_auto/placement_memory.json v1 → v2（schema_version:2）
// 只加欄位：schema_version / rules[] / case-level category,page_count,parent_order,
//           first_pass_total,first_pass_corrected,lessons[]
// v1 既有 key-path 一律逐一斷言完全相等（型別+值+陣列長度），任何差異即 exit 1，唔寫檔。
// Flow: 2026-09-13-0857（Canva 學習記錄重構）Verdict §2.2 / §2.7-#7
// 保留作審計證據，唔刪除。

const fs = require('fs');
const path = require('path');

const JSON_PATH = path.join(__dirname, '..', '..', 'canva_auto', 'placement_memory.json');
// v1 基準一律讀 pristine 備份（git HEAD 版本，喺 v2 覆寫之前先另存），
// 唔讀現存 JSON_PATH——因為第二次跑呢個腳本時 JSON_PATH 已經係 v2（含 schema_version/rules/lessons），
// 若以佢做「v1」基準，會將自己 v2 新加嘅值誤當「v1 既有值」鎖死，令後續修正被深比對擋住。
const V1_BACKUP_PATH = process.env.CANVA_V1_BACKUP || JSON_PATH;
const v1 = JSON.parse(fs.readFileSync(V1_BACKUP_PATH, 'utf8'));
if ('schema_version' in v1) {
  console.error('[canva_lessons_merge] FATAL: V1_BACKUP_PATH 指向嘅檔案已經係 v2（含 schema_version），唔可以做 v1 基準。');
  console.error('請設定 CANVA_V1_BACKUP 環境變數指向 pristine v1 備份（例：git show HEAD:canva_auto/placement_memory.json 輸出）。');
  process.exit(1);
}

// ---------- §1 規則編號表種子（來源：canva-auto.md 標題規則 + Known failure modes + 記憶檔 一~五）----------
const RULES = [
  { id: 'CV-01', type: 'ai_error', page: 'flow', flow_stage: 'stage3', applies_to: 'all',
    text: '母片元素永不可 delete_element，動畫/顯示時間附喺元素身上，刪咗 MCP 補唔返；換料一律 update_fill 原元素',
    promoted_to: 'canva-auto.md §元素保命鐵律' },
  { id: 'CV-02', type: 'tool_bug', page: 'flow', flow_stage: 'stage3', applies_to: 'all',
    text: '動畫一經設定（人手或母片繼承）即禁止再 resize_element/position_element，會改爛動畫同顯示時間；正確次序＝幾何一次做齊→驗收→設動畫→永久凍結',
    promoted_to: 'canva-auto.md §幾何凍結鐵律' },
  { id: 'CV-03', type: 'ai_error', page: 'flow', flow_stage: 'stage3', applies_to: 'all',
    text: '母片舊 container/imageBox 比例係上一個客嘅裁法唔係規格，每次 update_fill 後必須用公式即場重算 crop_media（box=max(W,H), left=(W-box)/2, top=(H-box)/2），禁止沿用母片值',
    promoted_to: 'canva-auto.md §零裁切鐵律' },
  { id: 'CV-04', type: 'fatmo_technique', page: [3], applies_to: '全幅AI短片',
    text: '全幅款 page3：背景＝同一客人直片（關聲）鋪 page 層 background.media；直片格闊度跟片方向調（直向貼頂裁、橫向加闊）；右下小組合＝page2 成品 UI 複製等比縮細',
    promoted_to: 'canva-auto.md §全幅款page3專屬做法' },
  { id: 'CV-05', type: 'ai_error', page: [2], applies_to: 'all',
    text: '母片兩張圖 container 可能唔對齊，AI 沿用會令疊圖交界出現硬邊；須統一 left 同 height 至完全一致（闊度各自按 asset 原生比例）',
    promoted_to: 'canva-auto.md §page2圖對必須統一left+height' },
  { id: 'CV-06', type: 'fatmo_technique', page: [2, 3, 4], applies_to: 'all',
    text: 'word.png 可反推字句 box 寬公式（word隱含fontSize=行距/lineHeight，scale=目標fontSize/隱含fontSize，need_width=墨水寬×scale+字數×fontSize×letterSpacing）；\\n 只保證最少行數，replace_text 後須讀 CDF 核對實際行數',
    promoted_to: 'canva-auto.md §word.png幾何真理源' },
  { id: 'CV-07', type: 'fatmo_technique', page: [2, 3, 4], applies_to: '特定版式家族（HoKaSin/Meika系）',
    text: '字句水平置中＝對齊花環左右草框視覺中心 960，唔係家庭圖 container 中心；此規則唔跨家族適用（yunggggm/Kaki 系字句偏右側）',
    promoted_to: 'canva-auto.md §字句水平置中' },
  { id: 'CV-08', type: 'fatmo_technique', page: [3], applies_to: 'all',
    text: 'page3 字句 locator_id 變新＝Fat Mo 喺 Canva UI 刪母片字句、複製 page2 貼上（非 bug）；AI 永不可模仿（delete_element+add_text 會炸走動畫）',
    promoted_to: 'canva-auto.md §UI複製字句手法（3單收斂）' },
  { id: 'CV-09', type: 'manual_only', page: 'flow', flow_stage: 'stage4', applies_to: 'all',
    text: '元素大小 AI 可驗（CDF size+imageBox）；元素顯示時間、動畫效果 AI 完全睇唔到；交付必須主動聲明後兩項待 Fat Mo 眼證，唔准講「應該冇問題」',
    promoted_to: 'canva-auto.md §Fat Mo驗收三項指標' },
  { id: 'CV-10', type: 'ai_error', page: 'flow', flow_stage: 'stage1', applies_to: 'all',
    text: '揀母片先睇 page3 結構家族（兩片疊放/四片疊放）分家族，家族內先揀音長最接近；揀錯家族會直接缺 slot，代價遠高於音長唔啱',
    promoted_to: 'canva-auto.md §母片選擇結構信號優先' },
  { id: 'CV-11', type: 'tool_bug', page: 'flow', flow_stage: 'stage5', applies_to: 'all',
    text: 'merge-designs 對超編輯上限嘅巨型 design 會「假成功」（回 success 但實際冇插入），必須事後 read-design 實查 page_count',
    promoted_to: 'canva-auto.md Known failure modes' },
  { id: 'CV-12', type: 'tool_bug', page: 'flow', flow_stage: 'stage5', applies_to: 'all',
    text: '巨型 design（實測156頁）開唔到 editing transaction；copy-design(page_numbers=[N]) 單頁複製唔受限係唯一入手點',
    promoted_to: 'canva-auto.md Known failure modes' },
  { id: 'CV-13', type: 'tool_bug', page: 'flow', flow_stage: 'tool', applies_to: 'all',
    text: 'editing transaction TTL 極短（分鐘級），中途等用戶回覆即過期報 not found；所有等待位必須在 transaction 之外',
    promoted_to: 'canva-auto.md Known failure modes' },
  { id: 'CV-14', type: 'tool_bug', page: 'flow', flow_stage: 'tool', applies_to: 'all',
    text: 'get-design-thumbnail 喺 transaction 內報 Not allowed（本帳號系統性）；改用 get-assets 縮圖或 commit 後 get-design-pages',
    promoted_to: 'canva-auto.md Known failure modes' },
  { id: 'CV-15', type: 'tool_bug', page: 'flow', flow_stage: 'tool', applies_to: 'all',
    text: '縮圖 URL 帶 fallbackstale=T＝過時快取不可信，重攞或直接出 export',
    promoted_to: 'canva-auto.md Known failure modes' },
  { id: 'CV-16', type: 'tool_bug', page: 'flow', flow_stage: 'tool', applies_to: 'all',
    text: 'edit-design 回傳嘅 draft 縮圖係 1:1 正方、而頁面係 16:9（水平壓縮咗），唔可以用嚟判斷比例；驗比例一律 export-design 出真圖',
    promoted_to: 'canva-auto.md Known failure modes' },
  { id: 'CV-17', type: 'tool_bug', page: [3, 4], applies_to: 'all',
    text: 'get-assets 嘅 video metadata.width/height 可以錯；破綻＝同一回應內縮圖 aspect 同 metadata aspect 唔一致；尺寸真理源＝本地 mp4 tkhd atom',
    promoted_to: 'canva-auto.md Known failure modes' },
  { id: 'CV-18', type: 'manual_only', page: [3], applies_to: 'all',
    text: 'page 根 video 元素（背景模糊層）update_fill 報 invalid duration，屬人手位',
    promoted_to: 'canva-auto.md Known failure modes' },
  { id: 'CV-19', type: 'tool_bug', page: 'flow', flow_stage: 'stage4', applies_to: 'all',
    text: "export jpg 的 quality 為必填（報 'quality' must not be null）；mp4 用字串 horizontal_1080p",
    promoted_to: 'canva-auto.md Known failure modes' },
  { id: 'CV-20', type: 'manual_only', page: 'flow', flow_stage: 'stage2', applies_to: 'all',
    text: '本地檔案 MCP 上載唔到（只收公開 URL）；上載區列唔出 video',
    promoted_to: 'canva-auto.md Known failure modes' },
  { id: 'CV-21', type: 'ai_error', page: [3], applies_to: 'all',
    text: 'resize_element 嘅 preserve_aspect_ratio=true 保留嘅係目前 container 現有比例，唔係 asset 原生比例；新素材比例明顯異於 container 時必須明確傳 width+height（preserve_aspect_ratio=false）',
    promoted_to: 'canva-auto.md §零裁切鐵律/Known failure modes' },
  { id: 'CV-22', type: 'tool_bug', page: [2, 3, 4], applies_to: 'all',
    text: '即使 resize_element 傳咗同 asset 吻合嘅長寬比，container 殘留舊 crop_media offset 唔會因 resize 而歸零；須額外顯式 call crop_media(top=0,left=0,width=container寬,height=container高)',
    promoted_to: 'canva-auto.md Known failure modes' },
  { id: 'CV-23', type: 'tool_bug', page: 'flow', flow_stage: 'tool', applies_to: 'all',
    text: '新 API operations 陣列一個 call 只可以改一頁（page_index 對應嗰頁），跨頁操作要分開幾個 call',
    promoted_to: 'canva-auto.md Known failure modes' },
  { id: 'CV-24', type: 'tool_bug', page: [2], applies_to: 'all',
    text: '判斷有冇去背：get-assets 縮圖同 update_fill 即時 draft 都會將透明畫成白，唯一可靠＝commit 後 export-design 真 PNG 量方框角像素',
    promoted_to: 'canva-auto.md Known failure modes' },
  { id: 'CV-25', type: 'material', page: 'flow', flow_stage: 'stage3', applies_to: 'all',
    text: '本地資料夾素材可能已過時（Fat Mo 會喺 Lovart 重出再上載），Canva asset 可以同本地檔唔同；Stage③ 以 Canva 實際 asset 為準',
    promoted_to: 'canva-auto.md Known failure modes' },
  { id: 'CV-26', type: 'ai_error', page: [3], applies_to: '全幅AI短片',
    text: 'page 層 background.media 獨立於 elements，Stage③ 讀 CDF 必須連每頁 background.media 一齊查，淨睇 elements 會漏換',
    promoted_to: 'canva-auto.md Known failure modes' },
  { id: 'CV-27', type: 'tool_bug', page: [3, 4], applies_to: 'all',
    text: 'get-assets video metadata 陷阱第6次重現：換任何 video 前強制讀本地 tkhd 或核對縮圖 aspect，唔准直接信 metadata',
    promoted_to: 'canva-auto.md Known failure modes' },
  { id: 'CV-28', type: 'fatmo_technique', page: 'flow', flow_stage: 'stage3', applies_to: 'all',
    text: '黃金配方只用4種operation：copy-design→update_title→replace_text×2→update_fill×N(母片原元素)→crop_media→position_element(只限字句)；零delete_element/零resize_element/媒體零position_element',
    promoted_to: 'canva-auto.md §黃金參考案例HoKaSin' },
  { id: 'CV-29', type: 'tool_bug', page: [3], applies_to: 'all',
    text: 'position_element 曾將 top/left 參數對調寫入（傳 top=X/left=Y 卻寫成 left=X/top=Y）；懷疑 MCP 異常，單一樣本，遇到可試反向傳參數規避',
    promoted_to: null },
  { id: 'CV-30', type: 'ai_error', page: [2], applies_to: 'all',
    text: '兩張 source 圖人物相對框架一致時，唯一裁切變因係 container 本身未統一；建議彩色圖 container 完整複製去黑白圖 container（left/top/w/h 四值全等），比 CV-05 單統一 left+height 更進一步——單樣本，與 CV-05 待收斂調和',
    promoted_to: null },
  { id: 'CV-31', type: 'fatmo_technique', page: [2, 3], applies_to: 'all',
    text: '字句行數變化（如 2→3 行）會連鎖影響同頁其他媒體格構圖，Fat Mo 需同時調字句 box+媒體大小/位置平衡；唔止係字句本身局部問題',
    promoted_to: null },
  { id: 'CV-32', type: 'fatmo_technique', page: [3], applies_to: 'all',
    text: 'video slot 數量會隨音訊時長變化；Fat Mo 傾向 Canva UI 直接刪多餘 slot+重排，而非要求 AI 用 MCP 改',
    promoted_to: null },
  { id: 'CV-33', type: 'material', page: 'flow', flow_stage: 'stage2', applies_to: 'all',
    text: '素材資料夾命名可以完全唔跟慣例（可能混雜非本產品線檔案），開工前應向 Fat Mo 確認素材角色，唔好靠檔名推斷',
    promoted_to: null },
  { id: 'CV-34', type: 'manual_only', page: 'flow', flow_stage: 'stage3', applies_to: 'all',
    text: '圖片/影片進場動畫效果+時序、頁面時長全部 MCP 做唔到（edit-design 冇 animation operation type），須 Fat Mo 人手設定，AI 只能記錄提示',
    promoted_to: 'canva-auto.md §Stage③人手補完提醒' },
  { id: 'CV-35', type: 'fatmo_technique', page: 'flow', flow_stage: 'stage1', applies_to: 'all',
    text: '母片搜尋 tiebreak：結構家族優先分家族後，家族內先揀音長最接近；音長打平手先睇建立日期，揀最接近（唔係最新）；設計標題新增音長標記 {DDMM}/26) {音長}sec',
    promoted_to: 'canva-auto.md §Stage①母片選擇' },
];

// ---------- §2 逐單 lessons + 分類/母片/首輪準確率 ----------
const CASES_PATCH = {
  '0600903': {
    category: '全幅AI短片', page_count: 5, parent_order: '0600906',
    first_pass_total: 8, first_pass_corrected: 8,
    lessons: [
      { page: [2], type: 'ai_error', rule: 'CV-03', text: '彩色圖沿用母片 container 尺寸放大16%上移；裁切公式本身無誤，錯在沿用母片 container', src: 'slots[page2_彩色圖].note' },
      { page: [2], type: 'fatmo_technique', rule: 'CV-05', text: '黑白圖 left 統一但 height/底邊未統一——母片元素被 Fat Mo 刪走換新元素所致，非 AI 換料手誤；同 CV-05「統一 left+height」規則有出入，單樣本未收斂，留意日後是否重現', src: 'slots[page2_黑白圖].note' },
      { page: [2], type: 'fatmo_technique', rule: 'CV-06', text: '33字兩行短句，字號+15.5%、字距0.094→0.11，Fat Mo 揀大字', src: 'slots[page2_字句].note' },
      { page: [2], type: 'tool_bug', rule: 'CV-24', text: '彩色圖1616²透明底，縮圖同即時 draft 都錯將透明畫白，只有 export 真 PNG 先驗到冇白框', src: 'slots[page2_彩色圖].asset+ngf[2]' },
      { page: [2], type: 'material', rule: 'CV-25', text: '彩色圖係 Fat Mo 喺 Lovart 重出（原896×1200有問題→1616×1616），本地舊檔已過時', src: 'ngf[2]' },
      { page: [3], type: 'ai_error', rule: 'CV-04', text: '直片沿用母片1092闊格＋置中裁→裁走嬰兒塊臉；改收窄至737貼頂裁', src: 'convergence_log[0600903].note' },
      { page: [3], type: 'ai_error', rule: 'CV-26', text: '漏換 page 層 background.media（全幅 page3 背景＝同一直片關聲鋪滿），AI 淨睇 elements', src: 'convergence_log[0600903].note' },
      { page: [4], type: 'tool_bug', rule: 'CV-27', text: 'video get-assets metadata 錯報810×2160，真值3:4（本地834×1112），AI 照 metadata 算 imageBox→垂直拉長2倍', src: 'convergence_log[0600903].note' },
      { page: 'flow', flow_stage: 'stage4', type: 'manual_only', rule: 'CV-09', text: 'Fat Mo 自己刪咗 page2黑白/page3小組合/page4動畫+字句改用新元素/UI複製；動畫佢人手設或複製帶過，AI睇唔到', src: 'non_geometry_findings[0]' },
      { page: 'flow', flow_stage: 'stage5', type: 'fatmo_technique', rule: null, text: '新月份合集流程首跑：上月合集 copy→改名→Fat Mo UI 貼頁；交貨前核對右上原相係本客（母版曾帶住上一客相）', src: 'canva-auto.md §Stage⑤ v1.7.0 新增（0600903 首例）' },
    ],
  },
  '0600302': {
    category: '純音樂', page_count: 4, parent_order: '0600506',
    first_pass_total: 3, first_pass_corrected: 3,
    lessons: [
      { page: [3], type: 'material', rule: null, text: '史上首見3條原始片（非2或4），4:3橫向非過往正方/直向；家族video slot數目非固定，隨音訊時長由 Fat Mo 事後刪減', src: 'case.note' },
      { page: [3], type: 'fatmo_technique', rule: 'CV-32', text: 'Fat Mo 因應 page3 音訊47秒喺Canva UI原生刪走第4段video（4→3），只保留3片再整組水平/垂直 translate（相對位置不變）', src: 'convergence_log[0600302][0].note' },
      { page: [3], type: 'fatmo_technique', rule: 'CV-08', text: 'UI複製手法首次由Fat Mo擴及video元素（過往3次收斂只見於文字元素），video locator_id同步全變新——非AI錯，AI永不可模仿', src: 'non_geometry_findings[0]' },
      { page: [2], type: 'fatmo_technique', rule: 'CV-05', text: 'Fat Mo 自己打破本庫「統一left+height」規則：彩色圖等比放大1.75%+左移141.32+上移9.85，同黑白圖不再統一——證明該規則係特定情境手法非放諸四海皆準嘅鐵律', src: 'case.note' },
      { page: 'flow', flow_stage: 'stage5', type: 'fatmo_technique', rule: null, text: 'Stage⑤存檔頁流程首例：短片page2→存檔頁精準仿射變換（s=0.369803187/tx=-105.011/ty=+40.440，簽名交叉驗證四項Δ=0）', src: 'convergence_log[0600302][1].note' },
      { page: 'flow', flow_stage: 'stage5', type: 'fatmo_technique', rule: null, text: '存檔頁字句唔跟仿射公式（Fat Mo另行重排字級/行高/字距，照replace_text繼承母版格式即可）；彩色插圖亦唔可以照抄純變換式數值，母版本身有人手微調，須沿用母版center同height', src: 'canva-auto.md §Stage⑤「幾何：短片page2→存檔頁」段落末段' },
      { page: 'flow', flow_stage: 'stage5', type: 'tool_bug', rule: 'CV-11', text: 'merge-designs假成功：回success但實際冇插入任何頁，必須事後read-design實查page_count', src: 'convergence_log[0600302][1].note' },
      { page: 'flow', flow_stage: 'stage5', type: 'tool_bug', rule: 'CV-12', text: '巨型design（實測156頁）開唔到editing transaction，copy-design(page_numbers=[N])單頁複製係唯一入手點', src: 'convergence_log[0600302][1].note' },
    ],
  },
  '0600506': {
    category: '純音樂', page_count: 4, parent_order: '0600901',
    first_pass_total: 3, first_pass_corrected: 3,
    lessons: [
      { page: [2], type: 'fatmo_technique', rule: 'CV-30', text: '黑白圖(1254²)同彩色圖(1024²)人物中心/margin frac幾乎一致，唯一裁切變因係container本身未統一——AI自行診斷並改用「彩色圖container完整複製去黑白圖」(left/top/w/h四值全等)徹底解決，比CV-05單統一left+height更進一步', src: 'case.note' },
      { page: [3], type: 'tool_bug', rule: 'CV-29', text: 'position_element第一次呼叫將top/left參數對調寫入（傳top=697.09/left=188.29卻寫成left=697.09/top=188.29），反向傳參數後先寫啱', src: 'case.note' },
      { page: [2, 3], type: 'fatmo_technique', rule: null, text: '字句font/位置類「加大+微調」問題，Fat Mo傾向直接自己喺Canva UI改而非交比AI算；須靠對比commit前後CDF數值分辨「佢已做咗」定「要求AI做」', src: 'non_geometry_findings[0]' },
      { page: [3], type: 'manual_only', rule: 'CV-34', text: '元素顯示時間拉長（非geometry），MCP完全冇對應operation，純人手位', src: 'non_geometry_findings[1]' },
    ],
  },
  '0600901': {
    category: '純音樂', page_count: 4, parent_order: '0600303',
    first_pass_total: 5, first_pass_corrected: 2,
    lessons: [
      { page: 'flow', flow_stage: 'stage1', type: 'fatmo_technique', rule: 'CV-10', text: '首次以結構信號（4條片×960×960×15.04sec四片疊放）而非音長距離揀母片，證實正確——音長最近嘅Meika/HoKaSin屬兩片疊放家族會缺slot', src: 'case.note+ngf[0]' },
      { page: [2], type: 'ai_error', rule: 'CV-03', text: 'crop_media 沿用母片舊imageBox值(588.46/595.18)而非按公式重算，Canva clamp放大9%令兩張圖四邊裁走26-52px；Fat Mo改正值同公式吻合度99.95%', src: 'case.note' },
      { page: [2], type: 'ai_error', rule: 'CV-05', text: 'page2圖對必須統一left+height（小數位對齊），母片本身唔對齊亦要主動矯正，否則疊圖交界出現直線硬邊', src: 'case.note' },
      { page: [2, 3], type: 'ai_error', rule: 'CV-06', text: 'replace_text後自動reflow成3行但word.png客人參考圖明示2行，AI接受咗3行未處理，未有讀CDF核對行數；Fat Mo要求改返2行', src: 'case.note' },
      { page: [2, 3, 4], type: 'fatmo_technique', rule: 'CV-06', text: 'word.png可反推text box寬度公式首次驗證（誤差0.61%）：scale=fontSize/(行距/lineHeight)，need=墨水寬×scale+字數×fontSize×letterSpacing；Fat Mo明示word.png可參考「字型大小及行數」', src: 'convergence_log[0600901].entries[6]' },
      { page: [3], type: 'fatmo_technique', rule: 'CV-08', text: 'page3字句UI複製手法第3次重現（繼0600303/0600905後），已達3單收斂門檻，升格規則層', src: 'convergence_log[0600901].entries[0]' },
      { page: 'flow', flow_stage: 'stage2', type: 'material', rule: 'CV-33', text: '素材夾再次混入非本產品線檔案（Free_Laser/UUID.jpg），同Woodcyn同一污染模式已成常態', src: 'ngf[1]' },
      { page: 'flow', flow_stage: 'stage1', type: 'material', rule: null, text: '客人素材可以中途補齊：開單只有3條片，AI主動提出缺口後Fat Mo即補上第4條——提出缺口比自作主張重複用同一條片正確', src: 'ngf[2]' },
    ],
  },
  '0600905': {
    category: '純音樂', page_count: 4, parent_order: '0601100',
    first_pass_total: 6, first_pass_corrected: 6,
    lessons: [
      { page: [2, 3], type: 'fatmo_technique', rule: 'CV-31', text: '三行字句首例，六格全部再調——唔係AI擺錯位，而係三行字句改變咗成頁構圖前提，母片幾何（為兩行而設）本身唔再適用', src: 'case.note' },
      { page: 'flow', flow_stage: 'stage2', type: 'material', rule: 'CV-33', text: '素材命名異於慣例（sound.mp3/Video 1/Video 3，無WhatsApp前綴），另混入Free_Laser/plaint/word/UUID.jpg等非本產品線檔案', src: 'ngf[0]' },
      { page: [2, 3], type: 'fatmo_technique', rule: 'CV-06', text: 'word.png已含拆行方式可直接跟，本單三行拆法即由此圖決定', src: 'ngf[1]' },
      { page: [3], type: 'fatmo_technique', rule: 'CV-08', text: 'Fat Mo喺Canva UI複製字句box跨頁貼上第2次重現，AI無對應安全MCP操作', src: 'ngf[2]' },
      { page: [2], type: 'material', rule: null, text: 'local_prep.py Parakeet色譜輸出第2次被Fat Mo棄用（改喺Canva自己做色），已達2/3收斂門檻——再多一單需升格「棄用Parakeet」規則', src: 'case.note' },
      { page: 'flow', flow_stage: 'stage3', type: 'fatmo_technique', rule: 'CV-01', text: '全程遵守黃金6步：零delete_element/零resize_element/零媒體position_element', src: 'case.note' },
    ],
  },
  '0600303': {
    category: '純音樂', page_count: 4, parent_order: 'Kaki design 74.1sec（訂單編號巧合同0600906重複但非同一設計，非本庫案例）',
    first_pass_total: 2, first_pass_corrected: 2,
    lessons: [
      { page: 'flow', flow_stage: 'stage1', type: 'material', rule: null, text: '長片款(78.0sec)首例；母片結構同HoKaSin唔同：page3一頁疊4個video元素（非「塞2段片」），page數固定4頁', src: 'case.note' },
      { page: [2, 3], type: 'fatmo_technique', rule: null, text: '字句letterSpacing會因應字數多寡由Fat Mo人手微調（0.073→0.146），母片值只係參考起點', src: 'non_geometry_findings[0]' },
      { page: [2], type: 'tool_bug', rule: 'CV-17', text: 'AI自行揪出並修正update_fill帶入嘅imageBox錯判(960x1920)，同get-assets bug同源第2次撞到', src: 'case.note+slots[page2].note' },
      { page: 'flow', flow_stage: 'stage3', type: 'fatmo_technique', rule: 'CV-28', text: '全程用足黃金參考4種operation，7個母片元素全部保留，零delete/resize/媒體position', src: 'case.note' },
    ],
  },
  '0601100': {
    category: '純音樂', page_count: 4, parent_order: '0600718',
    first_pass_total: 4, first_pass_corrected: 2,
    lessons: [
      { page: 'flow', flow_stage: 'stage3', type: 'ai_error', rule: 'CV-01', text: '🔴本庫最重要一課：連錯3次先揪出真因——動畫/顯示時間/頁面時長附喺「元素」身上唔係「素材」身上；delete_element刪走母片元素令動畫永久消失，MCP冇API補得返', src: 'case.note' },
      { page: 'flow', flow_stage: 'stage3', type: 'tool_bug', rule: 'CV-02', text: '推翻前一日結論：resize_element/position_element會改爛動畫同顯示時間（乾淨對照page2冇做→驗收全對，page3做咗→全爛）；crop_media未定罪', src: 'technique_lesson_2_geometry_freeze' },
      { page: [3], type: 'fatmo_technique', rule: 'CV-07', text: '字句水平置中＝對齊花環中心960（左右草框294→697.5/1179→1626外緣中點），唔係家庭圖container中心951.46', src: 'text_centring_rule' },
      { page: 'flow', flow_stage: 'stage3', type: 'ai_error', rule: 'CV-01', text: '診斷法：copy-design後即刻read-design記低母片元素locator_id，Stage③再讀時ID對得上=母片元素(保)、對唔上=Fat Mo臨時拖入(可刪)——唯一分辨方法，外觀完全一樣', src: 'technique_lesson' },
      { page: 'flow', flow_stage: 'stage2', type: 'manual_only', rule: null, text: 'Video 1.mp4未去背就上載，硬邊灰方框遮晒下層；自查法：get-assets縮圖見硬邊方形底色＝未去背', src: 'ngf[0]' },
      { page: 'flow', flow_stage: 'stage2', type: 'manual_only', rule: null, text: '純音樂款音訊未上載會繼承母片音軌，必做步驟', src: 'ngf[1]' },
      { page: 'flow', flow_stage: 'stage4', type: 'manual_only', rule: 'CV-09', text: '只要母片元素冇被刪，動畫/時長由母片繼承，Fat Mo唔使每單重設——之前4單「動畫永遠要人手補」其實被delete_element個bug掩蓋咗真相', src: 'ngf[2]' },
      { page: 'flow', flow_stage: 'stage3', type: 'fatmo_technique', rule: 'CV-28', text: '🏆黃金參考：Fat Mo判定「完美完成」，日後照跑，成功配方只用4種operation', src: 'golden_reference_2026_08_01' },
    ],
  },
  '0600904': {
    category: '純音樂', page_count: 4, parent_order: '0600718',
    first_pass_total: 4, first_pass_corrected: 0,
    lessons: [
      { page: [2, 3], type: 'ai_error', rule: 'CV-22', text: '首次套用precedent座標直接update_fill，4/4元素全部被裁切——container比例接近但唔完全一致，加上殘留舊asset crop_media offset，resize單靠對齊長寬比唔會自動清走', src: 'case.note' },
      { page: [2, 3], type: 'fatmo_technique', rule: 'CV-22', text: 'AI自行診斷並修正（resize_element明確傳width+height+crop_media(0,0,W,H)明確歸零），Fat Mo最終覆核確認冇問題——本輪首次AI喺Fat Mo郁手之前自行發現', src: 'case.note+technique_lesson' },
      { page: 'flow', flow_stage: 'stage1', type: 'fatmo_technique', rule: 'CV-35', text: '母片搜尋優先序定案：音長最接近→建立日期最接近（取代純「最新單」）；設計標題新增音長標記{DDMM}/26){音長}sec', src: 'case.note' },
      { page: 'flow', flow_stage: 'stage4', type: 'manual_only', rule: 'CV-34', text: '第4次重現：進場動畫/時序/片段時長依然MCP做唔到，人手步驟不變', src: 'ngf[0]' },
    ],
  },
  '0600718': {
    category: '純音樂', page_count: 4, parent_order: '0800802',
    first_pass_total: 4, first_pass_corrected: 4,
    lessons: [
      { page: [2, 3], type: 'tool_bug', rule: null, text: '母片相/片placeholder元素喺Fat Mo上載階段整段消失（估計人手拖入新素材時順手刪咗，非AI造成），AI改用insert_fill按precedent數值重新造格應對', src: 'case.note' },
      { page: [2, 3], type: 'ai_error', rule: null, text: '套用0800802精確數值嘅「零校正」假設不成立——雖然asset形狀高度吻合，Fat Mo最終4個slot全部再手動調整；母版裝飾佈局差異已足夠令最佳位置唔同，每單都要眼證', src: 'case.note' },
      { page: 'flow', flow_stage: 'stage4', type: 'manual_only', rule: 'CV-34', text: '第3次重現（繼Janet後）：圖片/影片進場動畫效果+時序、page時長全部MCP做唔到，已穩定重現3單，列為永久性結構限制，唔使再等收斂', src: 'ngf[0]' },
    ],
  },
  '0800802': {
    category: '純音樂', page_count: 4, parent_order: 'DAHN9LxGdEE（方形雙片疊放母片，非本庫案例，同本單直片來源不同源）',
    first_pass_total: 3, first_pass_corrected: 3,
    lessons: [
      { page: [3], type: 'material', rule: null, text: '首見page3雙直片版型（客人有2條Lovart動畫非1條），指定母片本身係方形雙片疊放同直片來源不同源，屬全新pattern冇precedent可查', src: 'case.note' },
      { page: [3], type: 'ai_error', rule: 'CV-21', text: 'resize_element preserve_aspect_ratio=true保留container現有比例（864x864方形）非asset原生比例（960x1920直向），兩片變形重疊；改傳明確width+height修正', src: 'technique_lesson' },
      { page: [2], type: 'manual_only', rule: 'CV-34', text: '黑白圖(parakeet後)有人手進場動畫（墨水/汙漬），Canva UI-only功能，MCP冇對應operation type', src: 'ngf[0]' },
      { page: [2], type: 'manual_only', rule: 'CV-34', text: '彩色圖(cutout)有人手進場動畫（風格待覆核），同上AI做唔到', src: 'ngf[1]' },
      { page: 'flow', flow_stage: 'stage2', type: 'manual_only', rule: null, text: '純音樂款設計音軌未換成客人真實音訊，Fat Mo原話「客人音訊都錯，我根本沒有上傳，你也沒有問我」；已加落Stage②清單提醒', src: 'ngf[2]' },
    ],
  },
  '0600906': {
    category: '全幅AI短片', page_count: 5, parent_order: null,
    first_pass_total: 6, first_pass_corrected: 6,
    lessons: [
      { page: [4], type: 'ai_error', rule: null, text: '🔴本case自標「最嚴重錯誤」：page4必須用Fat Mo另出嘅方形去背成品asset(VAHPF8LDnSs)，AI錯用咗原始直片(VAHPDrvaStI)', src: 'slots[page4_動畫].note' },
      { page: [3], type: 'ai_error', rule: null, text: '首單無案例可查，全部繼承舊格致變形；page3直片格首判「正確無改」後被推翻——Fat Mo事後改闊（客人片較闊16:9源塞窄直向格），連同首單合計6/6全部曾被修正，「零錯格」實際不存在', src: 'convergence_log[0600906].note（兩次記錄合併reconciled，非直接加總）' },
      { page: [2, 3], type: 'fatmo_technique', rule: null, text: 'page2/3字句box微調（top/left）；page3細版字句可獨立重拆行，同page2唔同；2026-07-22覆核再改成單一句、box輕微收窄', src: 'case.text_notes' },
      { page: 'flow', flow_stage: 'stage1', type: 'fatmo_technique', rule: null, text: '補課檢查制度價值首次體現：Step 0「先補課後開新單」機制在此案例首次證明必要', src: 'convergence_log[0600906].note' },
    ],
  },
};

// ---------- §3 深比對：v1 每個既有 key path 值必須完全不變 ----------
function walk(obj, prefix, out) {
  if (Array.isArray(obj)) {
    out.push([prefix + '.length', obj.length]);
    obj.forEach((v, i) => walk(v, `${prefix}[${i}]`, out));
  } else if (obj !== null && typeof obj === 'object') {
    for (const k of Object.keys(obj)) walk(obj[k], `${prefix}.${k}`, out);
  } else {
    out.push([prefix, obj]);
  }
}

function snapshotV1KeyPaths(v1obj) {
  const out = [];
  walk(v1obj, '$', out);
  return out;
}

const v1Snapshot = snapshotV1KeyPaths(v1);

// ---------- §4 建構 v2 物件（只加欄位，唔動任何 v1 既有 key）----------
const v2 = JSON.parse(JSON.stringify(v1)); // deep clone，避免動到原 object 參照
v2.schema_version = 2;
v2.rules = RULES;
for (const c of v2.cases) {
  const patch = CASES_PATCH[c.order];
  if (!patch) {
    console.error(`[canva_lessons_merge] FATAL: case ${c.order} 冇對應 patch，中止`);
    process.exit(1);
  }
  c.category = patch.category;
  c.page_count = patch.page_count;
  c.parent_order = patch.parent_order;
  c.first_pass_total = patch.first_pass_total;
  c.first_pass_corrected = patch.first_pass_corrected;
  c.lessons = patch.lessons;
}

// ---------- §5 驗證：v1 key path 逐一斷言完全相等（型別+值+陣列長度），v2 新增 key 忽略 ----------
function getByPath(root, p) {
  // p 格式如 "$.cases[3].note" —— 用返 walk() 生成嗰套規則手動 parse
  const tokens = p.slice(1); // 去掉開頭 $
  let cur = root;
  let i = 0;
  while (i < tokens.length) {
    if (tokens[i] === '.') { i++; continue; }
    if (tokens[i] === '[') {
      const end = tokens.indexOf(']', i);
      const idx = Number(tokens.slice(i + 1, end));
      cur = cur[idx];
      i = end + 1;
    } else {
      let end = i;
      while (end < tokens.length && tokens[end] !== '.' && tokens[end] !== '[') end++;
      const key = tokens.slice(i, end);
      if (key === 'length') { cur = cur.length; } else { cur = cur[key]; }
      i = end;
    }
  }
  return cur;
}

let mismatches = 0;
for (const [p, expected] of v1Snapshot) {
  let actual;
  try { actual = getByPath(v2, p); } catch (e) { actual = undefined; }
  const same = (typeof actual === typeof expected) && (actual === expected || (Number.isNaN(actual) && Number.isNaN(expected)));
  if (!same) {
    mismatches++;
    console.error(`[canva_lessons_merge] MISMATCH at ${p}: v1=${JSON.stringify(expected)} v2=${JSON.stringify(actual)}`);
  }
}

if (mismatches > 0) {
  console.error(`[canva_lessons_merge] ✗ ${mismatches} 個 v1 key path 值被改動，拒絕寫入`);
  process.exit(1);
}

console.log(`[canva_lessons_merge] ✓ v1 key path 完整性驗證通過（${v1Snapshot.length} 個路徑，0 個差異）`);

// ---------- §6 rule id 引用完整性檢查 ----------
const ruleIds = new Set(RULES.map(r => r.id));
let badRefs = 0;
for (const c of v2.cases) {
  for (const l of c.lessons) {
    if (l.rule !== null && !ruleIds.has(l.rule)) {
      console.error(`[canva_lessons_merge] 未知 rule 引用：case ${c.order} → ${l.rule}`);
      badRefs++;
    }
    if (l.rule === null && !l.type) {
      console.error(`[canva_lessons_merge] case ${c.order} 有 rule=null 嘅 lesson 但冇 type`);
      badRefs++;
    }
  }
}
if (badRefs > 0) {
  console.error(`[canva_lessons_merge] ✗ ${badRefs} 個規則引用問題，拒絕寫入`);
  process.exit(1);
}
console.log(`[canva_lessons_merge] ✓ rule 引用完整性通過（${RULES.length} 條規則）`);

// ---------- §7 rule id 唯一性檢查 ----------
if (ruleIds.size !== RULES.length) {
  console.error('[canva_lessons_merge] ✗ rules[] 有重複 id，拒絕寫入');
  process.exit(1);
}

// ---------- §8 寫入 ----------
fs.writeFileSync(JSON_PATH, JSON.stringify(v2, null, 2) + '\n', 'utf8');
console.log(`[canva_lessons_merge] ✓ 已寫入 ${JSON_PATH}`);
console.log(`[canva_lessons_merge] schema_version=2, rules=${RULES.length}, cases=${v2.cases.length}`);
