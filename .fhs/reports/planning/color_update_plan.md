# 3D Decoration Styles Color Update Plan

Update the color selection logic in `freehandsss_dashboardV40.html` to include more color options for 【嬰兒】 (Baby) and set the default selection to "待定" (Pending).

## Proposed Changes

### [Component: Dashboard UI]

#### [MODIFY] [freehandsss_dashboardV40.html](file:///d:/SynologyDrive/Free_handsss/freehandsss_dashboard/Freehandsss_Dashboard/freehandsss_dashboardV40.html)

1.  **Update Global Colors**: Add "玫瑰金" (Rose Gold) to the `colors` array.
2.  **Update Quick Color Logic**:
    *   Change `quickColors` filter in `renderLimbGrid` to include "待定".
    *   Set "待定" as the default `selected` option in `qcOptions`.
    *   Update `babyApplyFill` and `babyApplyAllCustom` to handle the default color correctly.

## Verification Plan

### Manual Verification
1.  Open the dashboard.
2.  Navigate to "立體擺設款式" (3D Decoration Styles).
3.  Verify that the 【嬰兒】 (Baby) color dropdown now defaults to "待定".
4.  Verify that "玫瑰金" is available in the color selection.
5.  Test changing the color and verify it applies correctly to the limbs (if in "all/left/right" mode).
