const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const html = fs.readFileSync('freehandsss_dashboardV26.html', 'utf8');

const dom = new JSDOM(html, {
    runScripts: "dangerously",
    resources: "usable"
});

const window = dom.window;
const document = window.document;

// Mock alert
window.alert = function (msg) {
    console.log("[ALERT]", msg);
};

// Intercept fetch
let sentPayloads = [];
window.fetch = async function (url, options) {
    console.log(`[FETCH] called for URL: ${url}`);
    if (options && options.method === 'POST') {
        const payload = JSON.parse(options.body);
        sentPayloads.push(payload);
        return { ok: true, json: async () => ({}) };
    }
    // Handle mock fetch for fetchOldOrder
    if (url.includes('fetch-fhs-order')) {
        return {
            ok: true,
            json: async () => ([{
                found: true,
                Deposit: 100,
                Balance: 50,
                Additional_Fee: 10,
                Raw_Form_State: JSON.stringify({
                    "momName": "Test_Mom",
                    "enableK": true,
                    "k_family_en": true,
                    "k_family_combo": "S2_BE",
                    "fam_p1_sel": "左腳",
                    "fam_p2_sel": "右腳",
                    "deposit": "100",
                    "balance": "50",
                    "additional": "10"
                })
            }])
        };
    }
    return { ok: false };
};

// Wait for scripts to load
setTimeout(async () => {
    console.log("=== STARTING TESTS ===");

    // Test 1: Family Combo Logic
    console.log("TEST 1: Family Combo Generation");
    document.getElementById('enableK').click();
    document.getElementById('k_family_en').click();

    // Simulate changing Family Combo to S2
    const familyComboSelect = document.getElementById('k_family_combo');
    familyComboSelect.value = "S2_BB";
    // Trigger change manually since jsdom might not fire it
    window.updateFamilyParts();

    document.getElementById('fam_p1_sel').value = "右手";
    document.getElementById('fam_p2_sel').value = "左腳";

    // Verify visibility and rendering 
    if (document.getElementById('fam_p2_wrap').style.display !== "none") {
        console.log(" - ✅ Family Combo S2 part 2 rendered properly.");
    } else {
        console.error(" - ❌ Family Combo part 2 was hidden.");
    }

    window.generate();

    await window.syncToAirtable();
    const payload1 = sentPayloads[0];

    let comboItem = payload1.Order_Items_List.find(i => i.Order_Item_Key.includes("FAM_COMBO"));
    if (comboItem && comboItem.Product_Name === "家庭(P2)鎖匙扣 - 不銹鋼" && comboItem.Notes.includes("父母手 + 嬰兒右手 + 嬰兒左腳")) {
        console.log(" - ✅ Payload Product Name and Composition is correct: " + comboItem.Product_Name);
    } else {
        console.error(" - ❌ Payload Product Name or Notes incorrect. Found: ", comboItem);
    }

    sentPayloads = [];

    // Test 2: Modify Order and Fetch (Search functionality)
    console.log("TEST 2: Modify Order and Search Functionality");
    // Switch Mode
    window.switchMode('edit');
    document.getElementById('searchOrderId').value = "TST12345";
    await window.fetchOldOrder();

    setTimeout(async () => {
        const momName = document.getElementById('momName').value;
        if (momName === "Test_Mom") {
            console.log(" - ✅ Found successfully populated value after Fetch.");
        } else {
            console.error(" - ❌ Failed to populate values from Fetch JSON.", momName);
        }

        let updateNote = "-";

        // Let's modify the name
        document.getElementById('momName').value = "Test_Mom_Updated";

        await window.syncToAirtable();
        const payload2 = sentPayloads[0];

        if (payload2.Update_Note && payload2.Update_Note.includes("Test_Mom_Updated") || payload2.Update_Note.includes("聯絡人")) {
            console.log(" - ✅ Update Note generated properly: ", payload2.Update_Note);
        } else {
            console.error(" - ❌ Update Note failed to capture changes. It is:", payload2.Update_Note);
        }

        console.log("=== TESTS FINISHED ===");
    }, 500);

}, 1000);
