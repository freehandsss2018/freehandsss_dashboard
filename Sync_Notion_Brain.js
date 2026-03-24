/**
 * FHS Sync_Notion_Brain.js - V1.3
 * Purpose: Global Brain Pruning & Selective Sync.
 */

const fs = require('fs');
const path = require('path');

const NOTION_TOKEN = "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";
const DATABASE_ID = "329574ef-3b8b-8135-80be-f248aedb9d46";
const BRAIN_ROOT = "C:\\Users\\Edwin\\.gemini\antigravity\\brain";
const LESSONS_DIR = path.join(__dirname, '.fhs', 'memory', 'lessons');

async function runPruneAndSync() {
    console.log("✂️ FHS Cloud Brain Pruning (V1.3) Started...");

    // 1. Define Whitelist/Keep List
    const highValueLessons = [
        "20260321_Airtable_Data_Cleansing_V3.5",
        "20260321_Final_Judgment_Protocols",
        "20260321_History_Indexing_Fix",
        "20260321_UI_System_Offline_Impeccable",
        "20260321_n8n_MCP_Activation",
        "20260320_1358_Memory_Engine_2.0_Architecture",
        "20260322_Unauthorized_Merge_Violation",
        "20260324_PowerShell_Encoding_Corruption_Crisis",
        "20260324_Incomplete_SOUL_Recovery_Incident",
        "20260324_System_Management_Chaos_Reflection",
        "20260324_Unauthorized_n8n_Rewrite_Incident",
        "20260324_n8n_Search_Formula_Stabilization_V45.5"
    ];

    const highValueSessions = [
        { id: "4d98d815-4689-4fb6-9e49-16f47e8fc94d", title: "Impeccable UI Redesign", summary: "系統視覺重構：實裝離線 Pure CSS Impeccable 規範，確定全域 4pt 網格與 Glassmorphism 審美標準。" },
        { id: "be64dfc8-03a8-4c17-8bc5-02a02c97acde", title: "Reinstalling Antigravity Software", summary: "系統恢復備忘：記錄 Antigravity 損毀時的手動重置流程與環境恢復步驟。" },
        { id: "1eefa31b-5b5a-469a-ac40-a6dbd7e6dd36", title: "Cloud Eye Activation (n8n)", summary: "n8n 系統監測對接：掛載 n8n-Antigravity MCP 伺服器，對接 NAS 工作流，實裝 Error Loop Shield 穩定排錯機制。" }
    ];

    const unwantedTitles = [
        "Dashboard Progress Update",
        "Researching Project Progress",
        "Syncing Development History",
        "20260321_Full_Check_Report",
        "20260321_JS_Init_Bug_Context"
    ];

    // 2. Prune Unwanted
    for (const title of unwantedTitles) {
        await archiveByTitle(title);
    }

    // 3. Sync High Value Lessons
    for (const title of highValueLessons) {
        const filePath = path.join(LESSONS_DIR, title + '.md');
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            await pushToNotion(title, content, "Memory");
        }
    }

    // 4. Update High Value Sessions
    for (const session of highValueSessions) {
        await pushToNotion(session.title, "", "Architecture", session.summary);
    }

    console.log("\n🏁 Pruning and Sync completed. Cloud Brain is now Filtered & Purified.");
}

async function archiveByTitle(title) {
    const searchResponse = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${NOTION_TOKEN}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            filter: { property: "title", title: { equals: title } }
        })
    });

    const searchResult = await searchResponse.json();
    if (searchResult.results && searchResult.results.length > 0) {
        for (const page of searchResult.results) {
            console.log(`🗑️ Archiving: ${title} (${page.id})...`);
            await fetch(`https://api.notion.com/v1/pages/${page.id}`, {
                method: "PATCH",
                headers: {
                    "Authorization": `Bearer ${NOTION_TOKEN}`,
                    "Notion-Version": "2022-06-28",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ archived: true })
            });
        }
    }
}

async function pushToNotion(title, markdown, defaultTag, forcedSummary = null) {
    const metadata = markdown ? extractMetadata(markdown) : { summary: forcedSummary, tags: [defaultTag] };
    if (forcedSummary) metadata.summary = forcedSummary;

    const searchResponse = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${NOTION_TOKEN}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            filter: { property: "title", title: { equals: title } }
        })
    });

    const searchResult = await searchResponse.json();
    const existingPage = searchResult.results && searchResult.results.length > 0 ? searchResult.results[0] : null;

    const properties = {
        title: { title: [{ text: { content: title } }] },
        Summary: { rich_text: [{ text: { content: metadata.summary || "" } }] },
        Tags: { multi_select: metadata.tags.map(t => ({ name: t })) }
    };

    if (existingPage) {
        console.log(`📝 Updating metadata for: ${title}`);
        await fetch(`https://api.notion.com/v1/pages/${existingPage.id}`, {
            method: "PATCH",
            headers: {
                "Authorization": `Bearer ${NOTION_TOKEN}`,
                "Notion-Version": "2022-06-28",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ properties })
        });
    } else if (markdown) {
        console.log(`✨ Creating new high-value page: ${title}`);
        const createResponse = await fetch("https://api.notion.com/v1/pages", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${NOTION_TOKEN}`,
                "Notion-Version": "2022-06-28",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                parent: { database_id: DATABASE_ID },
                properties,
                children: [{ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: "Imported from local memory agent." } }] } }]
            })
        });
    }
}

function extractMetadata(markdown) {
    const lines = markdown.split('\n');
    let summary = "";
    let tags = ["Memory"];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.includes("學習點總結")) {
            summary = (lines[i+1] || "").trim() || (lines[i+2] || "").trim();
            break;
        }
    }
    if (!summary) {
        for (let line of lines) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                summary = trimmed;
                break;
            }
        }
    }
    if (markdown.includes("Airtable")) tags.push("Airtable");
    if (markdown.includes("Bug") || markdown.includes("修復")) tags.push("Bugfix");
    if (markdown.includes("QA")) tags.push("QA");
    if (markdown.includes("UI")) tags.push("UI/UX");
    if (markdown.includes("Architecture")) tags.push("Architecture");
    return { summary: summary.substring(0, 200), tags: [...new Set(tags)] };
}

runPruneAndSync().catch(err => console.error(err));
