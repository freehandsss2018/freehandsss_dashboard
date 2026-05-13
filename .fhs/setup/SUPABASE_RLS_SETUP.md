# Supabase RLS 寫入原則設置

**目的**：允許 Dashboard（匿名公鑰）寫入 orders + order_items  
**執行方式**：Supabase Dashboard → SQL Editor → 逐條貼上執行

---

## 必須建立的 4 個 Policy

```sql
-- 1. orders INSERT
CREATE POLICY "orders_anon_insert"
  ON orders FOR INSERT TO anon WITH CHECK (true);

-- 2. orders UPDATE
CREATE POLICY "orders_anon_update"
  ON orders FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- 3. order_items INSERT
CREATE POLICY "order_items_anon_insert"
  ON order_items FOR INSERT TO anon WITH CHECK (true);

-- 4. order_items DELETE
CREATE POLICY "order_items_anon_delete"
  ON order_items FOR DELETE TO anon USING (true);
```

## 驗證

建立後至 **Authentication → Policies**，確認 4 條新 Policy 出現在 `orders` 與 `order_items` 表下。

## 回滾（如需撤銷）

```sql
DROP POLICY "orders_anon_insert" ON orders;
DROP POLICY "orders_anon_update" ON orders;
DROP POLICY "order_items_anon_insert" ON order_items;
DROP POLICY "order_items_anon_delete" ON order_items;
```
