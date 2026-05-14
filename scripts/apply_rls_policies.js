/**
 * apply_rls_policies.js
 * 用途：在 Supabase 建立 4 個 anon 寫入 RLS Policy，讓 sbSyncOrder() 能正常同步
 * 執行：node scripts/apply_rls_policies.js
 */

require('dotenv').config();

const SUPABASE_URL     = process.env.SUPABASE_URL;
const SERVICE_KEY      = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('❌ 缺少 SUPABASE_URL 或 SUPABASE_SERVICE_KEY，請確認 .env 檔案');
    process.exit(1);
}

// 使用 Supabase Management API 的 SQL 執行端點
const PROJECT_REF = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
if (!PROJECT_REF) {
    console.error('❌ 無法從 SUPABASE_URL 解析 project ref');
    process.exit(1);
}

const SQL_ENDPOINT = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

const policies = [
    {
        name: 'orders_anon_insert',
        sql: `CREATE POLICY IF NOT EXISTS "orders_anon_insert" ON orders FOR INSERT TO anon WITH CHECK (true);`
    },
    {
        name: 'orders_anon_update',
        sql: `CREATE POLICY IF NOT EXISTS "orders_anon_update" ON orders FOR UPDATE TO anon USING (true) WITH CHECK (true);`
    },
    {
        name: 'order_items_anon_insert',
        sql: `CREATE POLICY IF NOT EXISTS "order_items_anon_insert" ON order_items FOR INSERT TO anon WITH CHECK (true);`
    },
    {
        name: 'order_items_anon_delete',
        sql: `CREATE POLICY IF NOT EXISTS "order_items_anon_delete" ON order_items FOR DELETE TO anon USING (true);`
    }
];

async function applyPolicies() {
    console.log('🔐 開始建立 Supabase RLS 寫入 Policy...\n');

    for (const policy of policies) {
        try {
            const res = await fetch(SQL_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${SERVICE_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ query: policy.sql })
            });

            if (res.ok) {
                console.log(`✅ ${policy.name}`);
            } else {
                const body = await res.text();
                // Policy 已存在視為成功
                if (body.includes('already exists')) {
                    console.log(`✅ ${policy.name} (已存在，跳過)`);
                } else {
                    console.error(`❌ ${policy.name} 失敗 (${res.status}): ${body}`);
                }
            }
        } catch (err) {
            console.error(`❌ ${policy.name} 執行錯誤: ${err.message}`);
        }
    }

    console.log('\n🎉 完成！請至 Supabase Dashboard > Authentication > Policies 確認 4 條 Policy 存在。');
}

applyPolicies();
